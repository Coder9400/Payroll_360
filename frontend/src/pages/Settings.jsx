/**
 * Settings
 * ────────
 * Company profile, holiday calendar, role/permission overview, and integrations.
 */
import * as React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabs } from '../components/ui/Tabs';
import { useAuth } from '../context/AuthContext';
import {
  settingsService,
  loadHolidayCalendar,
  saveHolidayCalendar,
} from '../services/settingsService';
import { Building2, CalendarDays, Shield, Plug, Plus, Trash2 } from 'lucide-react';

const TABS = [
  { id: 'company', label: 'Company' },
  { id: 'holidays', label: 'Holiday calendar' },
  { id: 'roles', label: 'Roles & permissions' },
  { id: 'integrations', label: 'Integrations' },
];

const ROLE_MATRIX = [
  { permission: 'Employees (full)', employee: false, hr: true, payrollUser: true, payrollMgr: true, admin: true },
  { permission: 'Own profile only', employee: true, hr: true, payrollUser: true, payrollMgr: true, admin: true },
  { permission: 'Attendance approve', employee: false, hr: true, payrollUser: false, payrollMgr: true, admin: true },
  { permission: 'Leave approve', employee: false, hr: true, payrollUser: false, payrollMgr: true, admin: true },
  { permission: 'Contracts', employee: false, hr: true, payrollUser: false, payrollMgr: true, admin: true },
  { permission: 'Process payroll', employee: false, hr: false, payrollUser: true, payrollMgr: true, admin: true },
  { permission: 'Salary structures / rules', employee: false, hr: false, payrollUser: false, payrollMgr: true, admin: true },
  { permission: 'Company settings', employee: false, hr: false, payrollUser: false, payrollMgr: false, admin: true },
];

function Cell({ ok }) {
  return (
    <td className="px-3 py-2 text-center">
      <span className={ok ? 'text-emerald-600 font-semibold' : 'text-gray-300'}>{ok ? '✓' : '—'}</span>
    </td>
  );
}

export function Settings() {
  const { isAdmin } = useAuth();
  const canEdit = isAdmin();
  const [tab, setTab] = React.useState('company');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [companyName, setCompanyName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [legalEntities, setLegalEntities] = React.useState([]);
  const [message, setMessage] = React.useState('');
  const [holidays, setHolidays] = React.useState([]);
  const [newHoliday, setNewHoliday] = React.useState({ date: '', name: '' });

  React.useEffect(() => {
    setHolidays(loadHolidayCalendar());
    settingsService
      .getSettings()
      .then((data) => {
        setCompanyName(data.tenant?.name ?? '');
        setSlug(data.tenant?.slug ?? '');
        setLegalEntities(data.legalEntities ?? []);
      })
      .catch((err) => setMessage(err.response?.data?.error?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  const saveCompany = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const data = await settingsService.updateSettings({ name: companyName });
      setCompanyName(data.tenant?.name ?? companyName);
      setMessage('Company name saved.');
    } catch (err) {
      setMessage(err.response?.data?.error?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = (e) => {
    e.preventDefault();
    if (!newHoliday.date || !newHoliday.name.trim()) return;
    const next = [...holidays, { id: `h-${Date.now()}`, ...newHoliday }].sort((a, b) => a.date.localeCompare(b.date));
    setHolidays(next);
    saveHolidayCalendar(next);
    setNewHoliday({ date: '', name: '' });
  };

  const removeHoliday = (id) => {
    const next = holidays.filter((h) => h.id !== id);
    setHolidays(next);
    saveHolidayCalendar(next);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Company profile, holiday calendar, roles, and integrations."
      />

      <div className="bg-white rounded-xl border border-gray-200 px-6">
        <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />
      </div>

      {tab === 'company' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6 max-w-2xl">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <Building2 className="h-4 w-4 text-primary-600" /> Company
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <form onSubmit={saveCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <Input value={slug} disabled />
              </div>
              {legalEntities.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Legal entities</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {legalEntities.map((le) => (
                      <li key={le.id}>
                        {le.name}
                        {le.country ? ` · ${le.country}` : ''}
                        {le.is_default ? ' (default)' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {canEdit && (
                <Button type="submit" isLoading={saving}>Save</Button>
              )}
              {!canEdit && (
                <p className="text-xs text-gray-400">Only an Admin can change the company name.</p>
              )}
              {message && <p className="text-sm text-gray-600">{message}</p>}
            </form>
          )}
        </div>
      )}

      {tab === 'holidays' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <CalendarDays className="h-4 w-4 text-primary-600" /> Holiday calendar
          </div>
          <p className="text-sm text-gray-500">
            Public holidays used for planning. Stored for this browser until a shared calendar API is available.
          </p>
          <form onSubmit={addHoliday} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <Input type="date" value={newHoliday.date} onChange={(e) => setNewHoliday((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <Input value={newHoliday.name} onChange={(e) => setNewHoliday((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Diwali" />
            </div>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </form>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-400 border-b">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2">Holiday</th>
                <th className="py-2 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {holidays.map((h) => (
                <tr key={h.id}>
                  <td className="py-2 text-gray-700">{h.date}</td>
                  <td className="py-2 text-gray-900">{h.name}</td>
                  <td className="py-2 text-right">
                    <button type="button" onClick={() => removeHoliday(h.id)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'roles' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 overflow-x-auto">
          <div className="flex items-center gap-2 text-gray-900 font-semibold mb-4">
            <Shield className="h-4 w-4 text-primary-600" /> Roles & permissions
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Role assignments are managed in the database. This matrix shows what each built-in role can do.
          </p>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Capability</th>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">HR Manager</th>
                <th className="px-3 py-2">Payroll User</th>
                <th className="px-3 py-2">Payroll Manager</th>
                <th className="px-3 py-2">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ROLE_MATRIX.map((row) => (
                <tr key={row.permission}>
                  <td className="px-3 py-2 text-gray-800">{row.permission}</td>
                  <Cell ok={row.employee} />
                  <Cell ok={row.hr} />
                  <Cell ok={row.payrollUser} />
                  <Cell ok={row.payrollMgr} />
                  <Cell ok={row.admin} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'integrations' && (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <Plug className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Integrations</p>
          <p className="text-xs text-gray-400 mt-1">Biometric devices, PF/ESI filing, and SSO will land in a later phase.</p>
        </div>
      )}
    </div>
  );
}
