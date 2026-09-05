import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Edit2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { salaryRuleService } from '../../services/salaryRuleService';
import { cn } from '../../utils/cn';

export function StructuresList() {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStructures = async () => {
      try {
        const data = await salaryRuleService.getStructures();
        setStructures(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStructures();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Salary Structures"
          subtitle="Manage salary structures and their assigned rules"
        />
        <Link
          to="/payroll/structures/new"
          className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Create Structure
        </Link>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
          </div>
        ) : structures.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No structures found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new salary structure.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rules Count</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {structures.map((structure) => (
                  <tr key={structure.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {structure.name}
                      {structure.description && (
                        <div className="text-xs text-gray-500 font-normal">{structure.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{structure.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {structure.ruleIds ? structure.ruleIds.length : 0} rules
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                        structure.status === 'Active' ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      )}>
                        {structure.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <Link to={`/payroll/structures/${structure.id}`} className="text-primary-600 hover:text-primary-900 inline-flex items-center">
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Link>
                      <Link to={`/payroll/structures/${structure.id}/edit`} className="text-gray-400 hover:text-gray-600 inline-flex items-center">
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
