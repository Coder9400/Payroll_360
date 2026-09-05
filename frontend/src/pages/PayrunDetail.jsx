/**
 * PayrunDetail Page
 * ─────────────────
 * Shows payrun details with lifecycle buttons (Compute, Validate, Mark Paid).
 * Lists all payslips and allows click-through to individual payslip.
 */
import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { payrollService } from '../services/payrollService';
import { ChevronLeft, Play, CheckCircle, Users, DollarSign, AlertTriangle, TrendingUp, TrendingDown, Share2, Check } from 'lucide-react';

const STATUS_CONFIG = {
  DRAFT:      { label: 'Draft',      color: 'bg-gray-100 text-gray-600' },
  COMPUTING:  { label: 'Computing',  color: 'bg-blue-100 text-blue-700' },
  COMPUTED:   { label: 'Computed',   color: 'bg-yellow-100 text-yellow-700' },
  VALIDATED:  { label: 'Validated',  color: 'bg-indigo-100 text-indigo-700' },
  PAID:       { label: 'Paid',       color: 'bg-green-100 text-green-700' },
};

const LIFECYCLE_STEPS = ['DRAFT', 'COMPUTED', 'VALIDATED', 'PAID'];

function LifecycleStepper({ status }) {
  // COMPUTING is a transient sub-state of DRAFT for stepper purposes
  const effectiveStatus = status === 'COMPUTING' ? 'DRAFT' : status;
  const currentIdx = LIFECYCLE_STEPS.indexOf(effectiveStatus);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center">
        {LIFECYCLE_STEPS.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isLast = idx === LIFECYCLE_STEPS.length - 1;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  isDone ? 'bg-green-500 border-green-500 text-white'
                    : isCurrent ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span className={`text-xs font-medium ${isCurrent ? 'text-indigo-700' : isDone ? 'text-green-700' : 'text-gray-400'}`}>
                  {STATUS_CONFIG[step].label}
                </span>
              </div>
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-2 rounded transition-colors ${idx < currentIdx ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function fmt(v) {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PAYSLIP_STATUS_COLORS = {
  DRAFT:     'bg-gray-100 text-gray-600',
  COMPUTED:  'bg-yellow-100 text-yellow-700',
  VALIDATED: 'bg-indigo-100 text-indigo-700',
  PAID:      'bg-green-100 text-green-700',
};

export function PayrunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payrun, setPayrun] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(null);
  const [eligibleEmps, setEligibleEmps] = React.useState([]);
  const [showEmployeeSelect, setShowEmployeeSelect] = React.useState(false);
  const [selectedEmps, setSelectedEmps] = React.useState(new Set());
  const [computing, setComputing] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await payrollService.getPayrun(id);
      setPayrun(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  React.useEffect(() => { load(); }, [load]);

  const handleCompute = async () => {
    // Load eligible employees first
    setActionLoading('compute_load');
    try {
      const emps = await payrollService.getEligibleEmployees(id);
      setEligibleEmps(emps);
      // Pre-select eligible ones + those already in payslips
      const existingIds = new Set((payrun.payslips || []).map(p => p.employee_id));
      const eligibleIds = emps.filter(e => e.eligibility?.status === 'ELIGIBLE').map(e => e.id);
      setSelectedEmps(new Set([...eligibleIds, ...existingIds]));
      setShowEmployeeSelect(true);
    } catch (err) { alert(err.response?.data?.error?.message || err.message); }
    finally { setActionLoading(null); }
  };

  const handleRunCompute = async () => {
    if (selectedEmps.size === 0) { alert('Select at least one employee.'); return; }
    setComputing(true);
    try {
      await payrollService.computePayrun(id, [...selectedEmps]);
      setShowEmployeeSelect(false);
      await load();
    } catch (err) { alert(err.response?.data?.error?.message || err.message); }
    finally { setComputing(false); }
  };

  const handleValidate = async () => {
    if (!window.confirm('Validate this payrun? This will check all payslips for errors.')) return;
    setActionLoading('validate');
    try { await payrollService.validatePayrun(id); await load(); }
    catch (err) { alert(err.response?.data?.error?.message || err.message); }
    finally { setActionLoading(null); }
  };

  const handleMarkPaid = async () => {
    if (!window.confirm('Share payslips with employees? This marks the payrun as PAID and makes payslips visible to employees. This action is irreversible.')) return;
    setActionLoading('paid');
    try { await payrollService.markAsPaid(id); await load(); }
    catch (err) { alert(err.response?.data?.error?.message || err.message); }
    finally { setActionLoading(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading payrun…</div>
  );

  if (!payrun) return (
    <div className="text-center py-12 text-gray-400 text-sm">Payrun not found.</div>
  );

  const status = payrun.status || 'DRAFT';
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/payruns')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors">
          <ChevronLeft className="h-4 w-4" />Back to Payruns
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{payrun.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {fmtDate(payrun.period_start)} – {fmtDate(payrun.period_end)} ·{' '}
              {payrun.salary_structures?.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${sc.color}`}>{sc.label}</span>
            {/* Action buttons by status */}
            {(status === 'DRAFT' || status === 'COMPUTED') && (
              <Button onClick={handleCompute} isLoading={actionLoading === 'compute_load'}>
                <Play className="h-4 w-4 mr-1" />
                {status === 'COMPUTED' ? 'Recompute' : 'Compute'}
              </Button>
            )}
            {status === 'COMPUTED' && (
              <Button variant="outline" onClick={handleValidate} isLoading={actionLoading === 'validate'}>
                <CheckCircle className="h-4 w-4 mr-1" />Validate
              </Button>
            )}
            {status === 'VALIDATED' && (
              <Button onClick={handleMarkPaid} isLoading={actionLoading === 'paid'} className="bg-green-600 hover:bg-green-700">
                <Share2 className="h-4 w-4 mr-1" />Share Payslips
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Lifecycle stepper */}
      <LifecycleStepper status={status} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Employees',   value: payrun.total_employees, icon: Users,       color: 'text-blue-600 bg-blue-50' },
          { label: 'Gross',       value: fmt(payrun.total_gross), icon: TrendingUp,  color: 'text-green-600 bg-green-50' },
          { label: 'Deductions',  value: fmt(payrun.total_deductions), icon: TrendingDown, color: 'text-red-500 bg-red-50' },
          { label: 'Net Payable', value: fmt(payrun.total_net), icon: DollarSign,  color: 'text-indigo-600 bg-indigo-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Employee select panel */}
      {showEmployeeSelect && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Select Employees to Compute</h3>
          <p className="text-xs text-gray-500 mb-3">{selectedEmps.size} selected</p>
          <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input type="checkbox"
                      checked={selectedEmps.size === eligibleEmps.filter(e => e.eligibility?.status === 'ELIGIBLE').length}
                      onChange={() => {
                        const eligible = eligibleEmps.filter(e => e.eligibility?.status === 'ELIGIBLE').map(e => e.id);
                        setSelectedEmps(selectedEmps.size === eligible.length ? new Set() : new Set(eligible));
                      }} />
                  </th>
                  <th className="px-3 py-2 text-left">Employee</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {eligibleEmps.map(emp => {
                  const ok = emp.eligibility?.status === 'ELIGIBLE';
                  return (
                    <tr key={emp.id} className={!ok ? 'opacity-50' : ''}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selectedEmps.has(emp.id)} disabled={!ok}
                          onChange={() => ok && setSelectedEmps(prev => { const s = new Set(prev); s.has(emp.id) ? s.delete(emp.id) : s.add(emp.id); return s; })} />
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-gray-400">{emp.employee_code}</p>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {ok ? <span className="text-green-600 font-medium">✓ Eligible</span>
                           : <span className="text-red-500" title={emp.eligibility?.issue}>⚠ {emp.eligibility?.status}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEmployeeSelect(false)}>Cancel</Button>
            <Button isLoading={computing} onClick={handleRunCompute} disabled={selectedEmps.size === 0}>
              <Play className="h-4 w-4 mr-1" />Run Computation
            </Button>
          </div>
        </div>
      )}

      {/* Payslips table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Payslips ({(payrun.payslips || []).length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-right">Worked Days</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Deductions</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Warnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(payrun.payslips || []).map(ps => {
                const emp = ps.employees;
                return (
                  <tr key={ps.id} onClick={() => navigate(`/payslips/${ps.id}`)}
                    className="cursor-pointer hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{emp?.first_name} {emp?.last_name}</p>
                      <p className="text-xs text-gray-400">{emp?.employee_code}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{ps.worked_days}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(ps.gross_amount)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{fmt(ps.deduction_amount)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(ps.net_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYSLIP_STATUS_COLORS[ps.status] || 'bg-gray-100 text-gray-600'}`}>
                        {ps.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ps.warnings && ps.warnings.length > 0 && (
                        <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" title={ps.warnings.map(w => w.message).join('; ')} />
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!payrun.payslips || payrun.payslips.length === 0) && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No payslips yet. Click "Compute" to generate them.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
