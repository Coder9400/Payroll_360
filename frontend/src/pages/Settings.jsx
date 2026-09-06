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
import { settingsService, loadHolidayCalendar, saveHolidayCalendar } from '../services/settingsService';
import api from '../services/api';
import { Building2, CalendarDays, Shield, Plug, Plus, Trash2, MapPin } from 'lucide-react';

const TABS = [
  { id: 'company', label: 'Company' },
  { id: 'holidays', label: 'Holiday calendar' },
  { id: 'geofence', label: 'Geofence' },
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

  // Geofence state
  const [geofence, setGeofence] = React.useState({ officeLat: '', officeLng: '', geofenceRadius: 500 });
  const [geofenceSaving, setGeofenceSaving] = React.useState(false);
  const [geofenceMsg, setGeofenceMsg] = React.useState('');

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

    // Load geofence config
    api.get('/settings/geofence')
      .then((res) => {
        const d = res.data?.data;
        if (d) setGeofence({ officeLat: d.officeLat ?? '', officeLng: d.officeLng ?? '', geofenceRadius: d.geofenceRadius ?? 500 });
      })
      .catch(() => {}); // Non-critical, silently fail
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

  const saveGeofence = async (e) => {
    e.preventDefault();
    setGeofenceSaving(true);
    setGeofenceMsg('');
    try {
      await api.patch('/settings/geofence', {
        office_lat: geofence.officeLat,
        office_lng: geofence.officeLng,
        geofence_radius: geofence.geofenceRadius,
      });
      setGeofenceMsg('✅ Geofence settings saved successfully.');
    } catch (err) {
      setGeofenceMsg('❌ ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setGeofenceSaving(false);
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

      {tab === 'geofence' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6 max-w-2xl">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <MapPin className="h-4 w-4 text-primary-600" /> Geofence Configuration
          </div>
          <p className="text-sm text-gray-500">
            Set your office location and allowed check-in radius. Employees outside this radius will be blocked from checking in.
          </p>
          <form onSubmit={saveGeofence} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office Latitude</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 28.6139"
                  value={geofence.officeLat}
                  onChange={(e) => setGeofence(g => ({ ...g, officeLat: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office Longitude</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 77.2090"
                  value={geofence.officeLng}
                  onChange={(e) => setGeofence(g => ({ ...g, officeLng: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Geofence Radius (meters)
              </label>
              <Input
                type="number"
                min="50"
                max="50000"
                placeholder="500"
                value={geofence.geofenceRadius}
                onChange={(e) => setGeofence(g => ({ ...g, geofenceRadius: e.target.value }))}
                disabled={!canEdit}
              />
              <p className="text-xs text-gray-400 mt-1">
                Minimum 50m. Recommended 200–1000m for office buildings.
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 space-y-1">
              <p className="font-medium">💡 How to find your office coordinates:</p>
              <p>1. Open <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="underline">Google Maps</a></p>
              <p>2. Right-click on your office location</p>
              <p>3. Click the coordinates at the top of the menu to copy them</p>
            </div>
            {canEdit && (
              <Button type="submit" isLoading={geofenceSaving}>Save Geofence</Button>
            )}
            {!canEdit && <p className="text-xs text-gray-400">Only an Admin can change geofence settings.</p>}
            {geofenceMsg && <p className="text-sm text-gray-600">{geofenceMsg}</p>}
          </form>
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
