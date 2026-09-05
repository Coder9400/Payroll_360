/**
 * Organization
 * ────────────
 * Visual reporting hierarchy built client-side from the employee list.
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { EmployeeStatusBadge } from '../components/employee/EmployeeStatusBadge';
import { employeeService } from '../services/employeeService';

export function Organization() {
  const [employees, setEmployees] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const res = await employeeService.getEmployees({ limit: 500 });
        if (!cancelled) setEmployees(res.data ?? []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load employees');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const departmentGroups = React.useMemo(() => {
    const groups = {};
    for (const emp of employees) {
      const dept = emp.department || 'Unassigned';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(emp);
    }
    // Sort departments alphabetically
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [employees]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization"
        description="Department breakdown across the company."
      />

      {isLoading && (
        <div className="flex justify-center items-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 px-4 py-3 text-sm text-amber-700">
          Could not load organization data: {error}
        </div>
      )}

      {!isLoading && !error && employees.length === 0 && (
        <EmptyState
          icon={Users}
          title="No employees yet"
          description="Once employees are added, the department breakdown will appear here."
        />
      )}

      {!isLoading && !error && employees.length > 0 && (
        <div className="space-y-8">
          {departmentGroups.map(([deptName, deptEmployees]) => (
            <div key={deptName} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <Building2 className="h-5 w-5 text-primary-500" />
                  <h2 className="text-lg font-semibold">{deptName}</h2>
                </div>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {deptEmployees.length} {deptEmployees.length === 1 ? 'employee' : 'employees'}
                </span>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {deptEmployees.map(employee => (
                    <Link
                      key={employee.id}
                      to={`/employees/${employee.id}`}
                      className="flex flex-col rounded-lg border border-gray-200 p-4 hover:border-primary-300 hover:shadow-md transition-all bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar fallback={`${employee.firstName?.[0] ?? ''}${employee.lastName?.[0] ?? ''}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{employee.position}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                         <span className="text-xs font-medium text-gray-500">
                           {employee.employeeType === 'FULL_TIME' ? 'Full Time' : 
                            employee.employeeType === 'PART_TIME' ? 'Part Time' : 'Contractor'}
                         </span>
                         <EmployeeStatusBadge status={employee.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
