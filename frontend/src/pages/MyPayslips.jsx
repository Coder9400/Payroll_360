/**
 * MyPayslips Page (Employee Self-Service)
 * ───────────────────────────────────────
 * Allows employees to view their own payslips safely.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { payrollService } from '../services/payrollService';
import { FileText, Calendar, ChevronRight, DollarSign } from 'lucide-react';

function fmt(v) {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

function fmtDateMonthYear(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function MyPayslips() {
  const navigate = useNavigate();
  const [payslips, setPayslips] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    payrollService.getMyPayslips()
      .then(setPayslips)
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="My Payslips" description="View and download your historical salary slips." />

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading payslips…</div>
      ) : payslips.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-16 text-center">
          <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">You don't have any payslips yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {payslips.map(ps => (
            <div key={ps.id} onClick={() => navigate(`/payslips/${ps.id}`)}
              className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between group">
              
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                  <Calendar className="h-6 w-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">{fmtDateMonthYear(ps.period_end)}</p>
                  <p className="text-xs text-gray-500">{ps.payruns?.name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">Net Pay</p>
                  <p className="font-bold text-green-600 text-lg">{fmt(ps.net_amount)}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
