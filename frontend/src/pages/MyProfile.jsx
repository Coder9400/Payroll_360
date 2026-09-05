import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { employeeService } from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { EmployeeStatusBadge } from '../components/employee/EmployeeStatusBadge';
import { formatEnum } from '../utils/formatLabel';
import { Mail, Building, Briefcase, User } from 'lucide-react';

export function MyProfile() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const employeeId = currentUser?.employee?.id;
  const [employee, setEmployee] = React.useState(null);
  const [loading, setLoading] = React.useState(Boolean(employeeId));

  React.useEffect(() => {
    if (!employeeId) return;
    employeeService
      .getEmployee(employeeId)
      .then(setEmployee)
      .catch(() => setEmployee(null))
      .finally(() => setLoading(false));
  }, [employeeId]);

  const initials = (currentUser?.name || '?')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="My Profile" description="Your account and employee record." />

      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4">
        <Avatar fallback={initials} className="h-16 w-16" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-gray-900">{currentUser?.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{currentUser?.email}</p>
          <p className="text-sm text-gray-500 mt-1">{userRole}</p>
        </div>
        {employee && userRole !== 'Employee' && (
          <Button variant="outline" onClick={() => navigate(`/employees/${employee.id}`)}>
            Open full record
          </Button>
        )}
      </div>

      {employee ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Employee ID</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{employee.employeeId}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
            <div className="mt-1"><EmployeeStatusBadge status={employee.status} /></div>
          </div>
          <div className="flex items-start gap-2">
            <Building className="h-4 w-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Department</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{employee.department || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Briefcase className="h-4 w-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Job position</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{employee.position || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Manager</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{employee.managerName || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Type</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{formatEnum(employee.employeeType) || '—'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-sm text-gray-500">
          This login is not linked to an employee record yet. HR can link one from the Employees module.
        </div>
      )}
    </div>
  );
}
