/**
 * Payruns Page
 * ─────────────
 * Lists payruns with status. "New Payrun" opens the 2-step wizard.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { payrollService } from '../services/payrollService';
import { Plus, ChevronRight, Users, DollarSign, CheckCircle, Clock, AlertCircle, Bot } from 'lucide-react';

const STATUS_CONFIG = {
  DRAFT:      { label: 'Draft',      color: 'bg-gray-100 text-gray-600', icon: Clock },
  COMPUTING:  { label: 'Computing',  color: 'bg-blue-100 text-blue-700', icon: Clock },
  COMPUTED:   { label: 'Computed',   color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  VALIDATED:  { label: 'Validated',  color: 'bg-indigo-100 text-indigo-700', icon: CheckCircle },
  PAID:       { label: 'Paid',       color: 'bg-green-100 text-green-700', icon: CheckCircle },
};

function fmt(v) {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── 2-Step Payrun Wizard ──────────────────────────────────────────────────────
function PayrunWizard({ onClose, onCreated }) {
  const [step, setStep] = React.useState(1);
  const [structures, setStructures] = React.useState([]);
  const [form, setForm] = React.useState({ name: '', salary_structure_id: '', period_start: '', period_end: '' });
  const [payrun, setPayrun]   = React.useState(null);
  const [employees, setEmployees] = React.useState([]);
  const [selected, setSelected]   = React.useState(new Set());
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    payrollService.getSalaryStructures({ is_active: true }).then(setStructures).catch(() => {});
  }, []);

  const handleStep1 = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create payrun in DRAFT
      const pr = await payrollService.createPayrun(form);
      setPayrun(pr);
      // Load eligible employees
      const emps = await payrollService.getEligibleEmployees(pr.id);
      setEmployees(emps);
      // Auto-select eligible ones
      const eligibleIds = emps.filter(e => e.eligibility?.status === 'ELIGIBLE').map(e => e.id);
      setSelected(new Set(eligibleIds));
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message);
    } finally { setLoading(false); }
  };

  const handleToggle = (id) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleCreate = async () => {
    if (selected.size === 0) { alert('Select at least one employee.'); return; }
    setCreating(true);
    try {
      onCreated(payrun);
    } finally { setCreating(false); }
  };

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-2">
        {[1, 2].map(s => (
          <React.Fragment key={s}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{s}</div>
            {s < 2 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-4">
          <h3 className="font-semibold text-gray-800">Step 1: Payrun Configuration</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Salary Structure *</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.salary_structure_id} onChange={e => setForm(f => ({...f, salary_structure_id: e.target.value}))} required>
              <option value="">Select a salary structure…</option>
              {structures.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Period Start *</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.period_start} onChange={e => setForm(f => ({...f, period_start: e.target.value}))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Period End *</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.period_end} min={form.period_start} onChange={e => setForm(f => ({...f, period_end: e.target.value}))} required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name (optional)</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Auto-generated if left blank" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={loading}>Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Step 2: Select Employees</h3>
          <p className="text-xs text-gray-500">{selected.size} of {employees.length} employees selected</p>
          <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input type="checkbox" checked={selected.size === employees.filter(e => e.eligibility?.status === 'ELIGIBLE').length}
                      onChange={() => {
                        const eligible = employees.filter(e => e.eligibility?.status === 'ELIGIBLE').map(e => e.id);
                        setSelected(selected.size === eligible.length ? new Set() : new Set(eligible));
                      }} />
                  </th>
                  <th className="px-3 py-2 text-left">Employee</th>
                  <th className="px-3 py-2 text-left">Department</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map(emp => {
                  const isEligible = emp.eligibility?.status === 'ELIGIBLE';
                  return (
                    <tr key={emp.id} className={!isEligible ? 'opacity-50 bg-red-50' : ''}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selected.has(emp.id)} disabled={!isEligible}
                          onChange={() => isEligible && handleToggle(emp.id)} />
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-gray-400">{emp.employee_code}</p>
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{emp.departments?.name ?? '—'}</td>
                      <td className="px-3 py-2">
                        {isEligible ? (
                          <span className="text-xs text-green-600 font-medium">✓ Eligible</span>
                        ) : (
                          <span className="text-xs text-red-500" title={emp.eligibility?.issue}>⚠ {emp.eligibility?.status}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button isLoading={creating} onClick={handleCreate} disabled={selected.size === 0}>
                <Users className="h-4 w-4 mr-1" />Create Payrun
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function Payruns() {
  const navigate = useNavigate();
  const [payruns, setPayruns] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showWizard, setShowWizard] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try { setPayruns(await payrollService.getPayruns()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleCreated = (payrun) => {
    setShowWizard(false);
    navigate(`/payruns/${payrun.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Payruns" description="Manage payroll processing cycles." />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-violet-300 text-violet-700 hover:bg-violet-50"
            onClick={() => navigate('/ai-agent')}
          >
            <Bot className="h-4 w-4 mr-1" /> AI Payroll Agent
          </Button>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4 mr-1" />New Payrun
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading payruns…</div>
      ) : payruns.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-16 text-center">
          <DollarSign className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No payruns yet. Click "New Payrun" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payruns.map(p => {
            const s = STATUS_CONFIG[p.status] || STATUS_CONFIG.DRAFT;
            const Icon = s.icon;
            return (
              <div key={p.id} onClick={() => navigate(`/payruns/${p.id}`)}
                className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-all flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {fmtDate(p.period_start)} → {fmtDate(p.period_end)} · {p.salary_structures?.name || ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-400">Employees</p>
                    <p className="font-semibold text-gray-900">{p.total_employees}</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-400">Net Total</p>
                    <p className="font-semibold text-gray-900">{fmt(p.total_net)}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${s.color}`}>
                    <Icon className="h-3.5 w-3.5" />{s.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showWizard} onClose={() => setShowWizard(false)} title="New Payrun">
        <PayrunWizard onClose={() => setShowWizard(false)} onCreated={handleCreated} />
      </Modal>
    </div>
  );
}
