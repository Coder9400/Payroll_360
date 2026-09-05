import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Banknote, 
  Users, 
  FileText, 
  AlertCircle,
  Plus,
  ArrowRight
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { payrollService } from '../../services/payrollService';
import { cn } from '../../utils/cn';

export function PayrollDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const dashboardData = await payrollService.getDashboardData();
        setData(dashboardData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <h3 className="text-sm font-medium text-red-800">Error</h3>
        <div className="mt-2 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  const kpis = [
    {
      name: 'Total Gross Salary',
      value: `₹${data.totalGross.toLocaleString()}`,
      icon: Banknote,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Total Net Salary',
      value: `₹${data.totalNet.toLocaleString()}`,
      icon: Banknote,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
    },
    {
      name: 'Payslips Generated',
      value: data.payslipsGenerated,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Payroll Warnings',
      value: data.warningsCount,
      icon: AlertCircle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Payroll Dashboard"
          subtitle={`Current Period: ${data.currentPeriod}`}
        />
        <Link
          to="/payroll/payruns/new"
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors sm:w-auto"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Create Payrun
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.name}
            className="overflow-hidden rounded-lg bg-white shadow-sm border border-gray-100"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={cn("rounded-md p-3", kpi.bgColor)}>
                    <kpi.icon className={cn("h-6 w-6", kpi.color)} aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">{kpi.name}</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{kpi.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Payruns</h3>
          <Link to="/payroll/payruns" className="text-sm font-medium text-primary-600 hover:text-primary-500 flex items-center">
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        
        {data.recentPayruns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employees
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Gross
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.recentPayruns.map((payrun) => (
                  <tr key={payrun.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/payroll/payruns/${payrun.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-900">
                        {payrun.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payrun.periodStart} - {payrun.periodEnd}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payrun.employeeCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      ₹{payrun.totalGross.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                        payrun.status === 'Draft' && "bg-gray-100 text-gray-800",
                        payrun.status === 'Computed' && "bg-blue-100 text-blue-800",
                        payrun.status === 'Validated' && "bg-green-100 text-green-800",
                        payrun.status === 'Paid' && "bg-purple-100 text-purple-800",
                      )}>
                        {payrun.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10">
            <Receipt className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payruns</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new payrun.</p>
          </div>
        )}
      </div>
    </div>
  );
}
