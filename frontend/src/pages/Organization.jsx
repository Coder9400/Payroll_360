/**
 * Organization
 * ────────────
 * Visual reporting hierarchy built client-side from the employee list.
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { EmployeeStatusBadge } from '../components/employee/EmployeeStatusBadge';
import { employeeService } from '../services/employeeService';

function EmployeeNode({ employee, childrenMap }) {
  const children = childrenMap.get(employee.id) ?? [];
  return (
    <div className="flex flex-col items-center">
      <Link
        to={`/employees/${employee.id}`}
        className="w-56 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-primary-300 transition-shadow"
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
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">{employee.department}</span>
          <EmployeeStatusBadge status={employee.status} />
        </div>
      </Link>

      {children.length > 0 && (
        <>
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex flex-wrap justify-center gap-6 pt-0">
            {children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="h-6 w-px bg-gray-300" />
                <EmployeeNode employee={child} childrenMap={childrenMap} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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

  const { roots, childrenMap } = React.useMemo(() => {
    const map = new Map();
    const rootList = [];
    for (const emp of employees) {
      if (!emp.manager) {
        rootList.push(emp);
        continue;
      }
      if (!map.has(emp.manager)) map.set(emp.manager, []);
      map.get(emp.manager).push(emp);
    }
    return { roots: rootList, childrenMap: map };
  }, [employees]);

  return (
    <div>
      <PageHeader
        title="Organization"
        description="Reporting hierarchy across the company."
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
          description="Once employees are added, the reporting hierarchy will appear here."
        />
      )}

      {!isLoading && !error && employees.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-8">
          <div className="flex justify-center gap-10 min-w-max">
            {roots.map((root) => (
              <EmployeeNode key={root.id} employee={root} childrenMap={childrenMap} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
