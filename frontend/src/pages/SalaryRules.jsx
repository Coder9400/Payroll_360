/**
 * Salary Rules — flat list across all salary structures.
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { payrollService } from '../services/payrollService';
import { BookOpen } from 'lucide-react';

const CATEGORY_COLORS = {
  BASIC: 'bg-blue-100 text-blue-800',
  ALLOWANCE: 'bg-green-100 text-green-800',
  GROSS: 'bg-purple-100 text-purple-800',
  DEDUCTION: 'bg-red-100 text-red-800',
  CONTRIBUTION: 'bg-orange-100 text-orange-800',
  NET: 'bg-gray-100 text-gray-800',
};

function ruleValue(rule) {
  if (rule.computation_type === 'FIXED') return rule.fixed_amount;
  if (rule.computation_type === 'PERCENTAGE') return `${rule.percentage_value}% of ${rule.percentage_base}`;
  if (rule.computation_type === 'FORMULA') return rule.formula;
  return '—';
}

export function SalaryRules() {
  const [rules, setRules] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    payrollService
      .getSalaryRules()
      .then(setRules)
      .catch((e) => setError(e.response?.data?.error?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salary Rules"
        description="Computation rules attached to salary structures. Edit them from the parent structure."
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-sm text-gray-400">Loading…</p>
        ) : error ? (
          <p className="p-8 text-center text-sm text-red-600">{error}</p>
        ) : rules.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No salary rules yet.</p>
            <Link to="/salary-structures" className="text-sm text-primary-600 hover:underline mt-2 inline-block">
              Open Salary Structures
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Structure</th>
                <th className="px-4 py-3 text-left">Seq</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Value</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rules.map((rule) => (
                <tr key={rule.id} className={!rule.is_active ? 'opacity-40' : ''}>
                  <td className="px-4 py-3 text-gray-700">
                    {rule.salary_structures?.name ?? '—'}
                    <span className="block text-xs text-gray-400 font-mono">{rule.salary_structures?.code}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{rule.sequence}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{rule.code}</td>
                  <td className="px-4 py-3">{rule.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[rule.category] || 'bg-gray-100 text-gray-700'}`}>
                      {rule.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{rule.computation_type}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-600 max-w-[180px] truncate">{ruleValue(rule)}</td>
                  <td className="px-4 py-3 text-xs">{rule.is_active ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
