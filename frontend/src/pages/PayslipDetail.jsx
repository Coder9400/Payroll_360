/**
 * PayslipDetail Page
 * ──────────────────
 * Detailed view of a single payslip including the rule-by-rule breakdown (payslip_lines).
 */
import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { payrollService } from '../services/payrollService';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, FileText, Calendar, Building, DollarSign, Download, AlertTriangle } from 'lucide-react';

function fmt(v) {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_COLORS = {
  DRAFT:     'bg-gray-100 text-gray-600 border-gray-200',
  COMPUTED:  'bg-yellow-100 text-yellow-700 border-yellow-200',
  VALIDATED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  PAID:      'bg-green-100 text-green-700 border-green-200',
};

export function PayslipDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [payslip, setPayslip] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    payrollService.getPayslip(id)
      .then(setPayslip)
      .catch(e => { console.error(e); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading payslip details…</div>
  );

  if (!payslip) return (
    <div className="text-center py-12 text-gray-400 text-sm">Payslip not found or access denied.</div>
  );

  // Group lines into Earnings and Deductions for the classic two-column payslip format
  const lines = payslip.payslip_lines || [];
  const earnings = lines.filter(l => ['BASIC', 'ALLOWANCE', 'GROSS'].includes(l.category));
  const deductions = lines.filter(l => ['DEDUCTION', 'CONTRIBUTION'].includes(l.category));
  
  // The backend already aggregates gross, deductions, and net
  const gross = payslip.gross_amount;
  const totDed = payslip.deduction_amount;
  const net = payslip.net_amount;

  const emp = payslip.employees;
  const run = payslip.payruns;
  const st = STATUS_COLORS[payslip.status] || STATUS_COLORS.DRAFT;

  // Determine back navigation based on role. Employee goes to My Payslips, others go to Payrun.
  const isSelfService = user?.id === emp?.user_id || profile?.role === 'employee';
  const backLink = isSelfService ? '/my-payslips' : `/payruns/${payslip.payrun_id}`;
  const backText = isSelfService ? 'Back to My Payslips' : 'Back to Payrun';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header & Print Action */}
      <div className="flex items-center justify-between no-print">
        <button onClick={() => navigate(backLink)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ChevronLeft className="h-4 w-4" />{backText}
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors">
          <Download className="h-4 w-4" />Print / Save PDF
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden payslip-container">
        
        {/* Payslip Header Area */}
        <div className="p-8 border-b border-gray-100">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">PeoplePay360</h1>
              <p className="text-sm text-gray-500">Salary Slip for {fmtDate(payslip.period_start)} – {fmtDate(payslip.period_end)}</p>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${st}`}>
              {payslip.status}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Employee Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Employee Details</h3>
              <div className="grid grid-cols-3 text-sm gap-y-2">
                <span className="text-gray-500">Name</span>
                <span className="col-span-2 font-medium text-gray-900">{emp?.first_name} {emp?.last_name}</span>
                
                <span className="text-gray-500">Emp Code</span>
                <span className="col-span-2 font-mono text-gray-900">{emp?.employee_code}</span>
                
                <span className="text-gray-500">Email</span>
                <span className="col-span-2 text-gray-900">{emp?.email}</span>
                
                <span className="text-gray-500">Department</span>
                <span className="col-span-2 text-gray-900">{emp?.departments?.name || '—'}</span>

                <span className="text-gray-500">Position</span>
                <span className="col-span-2 text-gray-900">{emp?.job_positions?.name || '—'}</span>
              </div>
            </div>

            {/* Payroll Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payroll Details</h3>
              <div className="grid grid-cols-3 text-sm gap-y-2">
                <span className="text-gray-500">Payrun</span>
                <span className="col-span-2 text-gray-900">{run?.name}</span>
                
                <span className="text-gray-500">Structure</span>
                <span className="col-span-2 text-gray-900">{payslip.salary_structures?.name}</span>
                
                <span className="text-gray-500">Contract Wage</span>
                <span className="col-span-2 font-medium text-gray-900">{fmt(payslip.contract_wage)}</span>
                
                <span className="text-gray-500">Working Days</span>
                <span className="col-span-2 text-gray-900">{payslip.working_days}</span>
                
                <span className="text-gray-500">Paid Days</span>
                <span className="col-span-2 text-gray-900">{payslip.paid_days} <span className="text-xs text-gray-400 ml-1">({payslip.worked_days} worked + {payslip.paid_leave_days} leave)</span></span>

                {Number(payslip.unpaid_leave_days) > 0 && (
                  <>
                    <span className="text-amber-600">Unpaid Leave</span>
                    <span className="col-span-2 font-medium text-amber-700">
                      {payslip.unpaid_leave_days} day{payslip.unpaid_leave_days === 1 ? '' : 's'}
                    </span>
                  </>
                )}
              </div>

              {Number(payslip.unpaid_leave_days) > 0 && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Basic Salary was reduced for {payslip.unpaid_leave_days} unpaid leave day{payslip.unpaid_leave_days === 1 ? '' : 's'} out of {payslip.working_days} working days this period.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Warnings */}
        {payslip.warnings && payslip.warnings.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-100 p-4 px-8 text-sm text-amber-800 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Computation Warnings</p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                {payslip.warnings.map((w, i) => <li key={i}>{w.message}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Salary Breakdown (Two Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {/* Earnings */}
          <div>
            <div className="bg-gray-50 px-8 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Earnings</h3>
            </div>
            <div className="p-8 space-y-4">
              {earnings.map(l => (
                <div key={l.id} className={`flex justify-between text-sm ${l.category === 'GROSS' ? 'font-bold text-gray-900 pt-2 border-t' : 'text-gray-700'}`}>
                  <span>{l.name}</span>
                  <span>{fmt(l.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Deductions */}
          <div>
            <div className="bg-gray-50 px-8 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Deductions</h3>
            </div>
            <div className="p-8 space-y-4">
              {deductions.map(l => (
                <div key={l.id} className="flex justify-between text-sm text-gray-700">
                  <span>{l.name}</span>
                  <span className="text-red-600">{fmt(l.amount)}</span>
                </div>
              ))}
              {deductions.length === 0 && (
                <p className="text-sm text-gray-400 italic">No deductions.</p>
              )}
            </div>
          </div>
        </div>

        {/* Totals Footer */}
        <div className="bg-gray-800 text-white p-8 grid grid-cols-3 gap-8">
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Total Earnings</p>
            <p className="text-xl font-bold">{fmt(gross)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Total Deductions</p>
            <p className="text-xl font-bold text-red-300">{fmt(totDed)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Net Payable</p>
            <p className="text-3xl font-bold text-green-400">{fmt(net)}</p>
          </div>
        </div>

      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page { margin: 12mm; }
          body { background: white; }
          .no-print { display: none !important; }
          .payslip-container { border: none; box-shadow: none; }
          .payslip-container, .payslip-container * { color: black !important; }
          .payslip-container .bg-gray-800 { background: white !important; border-top: 2px solid black; }
        }
      `}</style>
    </div>
  );
}
