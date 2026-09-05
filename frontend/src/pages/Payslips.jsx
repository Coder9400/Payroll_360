import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { payrollService } from '../services/payrollService';
import { FileText, ChevronRight } from 'lucide-react';

function fmt(v) {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

function fmtPeriod(ps) {
  const d = ps.period_end || ps.period_start;
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function Payslips() {
  const navigate = useNavigate();
  const [payslips, setPayslips] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    payrollService
      .getPayslips({ limit: 100 })
      .then(setPayslips)
      .catch(() => setPayslips([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Payslips" description="All generated payslips across payruns." />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
        ) : payslips.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No payslips yet. Compute a payrun to generate them.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payslips.map((ps) => {
                const emp = ps.employees;
                const name = emp ? `${emp.first_name} ${emp.last_name}` : (ps.employee_name ?? '—');
                return (
                  <tr
                    key={ps.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/payslips/${ps.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtPeriod(ps)}</td>
                    <td className="px-4 py-3 text-gray-600">{ps.status}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(ps.net)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      <ChevronRight className="h-4 w-4 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
