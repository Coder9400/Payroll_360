import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { salaryRuleService } from '../../services/salaryRuleService';
import { cn } from '../../utils/cn';

export function RulesList() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const data = await salaryRuleService.getRules();
        setRules(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRules();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Salary Rules"
          subtitle="Configure rules used for payroll calculation"
        />
        <Link
          to="/payroll/rules/new"
          className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Add Rule
        </Link>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No rules configured</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new salary rule.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sequence</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calc Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Edit</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rule.sequence}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rule.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rule.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={cn("px-2 py-1 rounded-md text-xs font-medium", 
                        rule.category === 'Basic' && 'bg-blue-100 text-blue-800',
                        rule.category === 'Allowance' && 'bg-green-100 text-green-800',
                        rule.category === 'Deduction' && 'bg-red-100 text-red-800',
                        rule.category === 'Gross' && 'bg-purple-100 text-purple-800',
                        rule.category === 'Net' && 'bg-gray-800 text-white'
                      )}>
                        {rule.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rule.calculationType}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn("px-2 inline-flex text-xs leading-5 font-semibold rounded-full", rule.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800")}>
                        {rule.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/payroll/rules/${rule.id}/edit`} className="text-primary-600 hover:text-primary-900">
                        <Edit2 className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
