/**
 * Dashboard
 * ─────────
 * Role-specific overview built from GET /api/dashboard/stats.
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Users, ClipboardCheck, CalendarDays, Receipt, FileText,
  ArrowRight, Clock, Wallet,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dashboardService';

function StatCard({ label, value, icon: Icon, iconBg, iconColor, sub }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-gray-600">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function money(n) {
  const num = Number(n ?? 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function Dashboard() {
  const { currentUser, userRole } = useAuth();
  const [stats, setStats] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const data = await dashboardService.getStats();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load dashboard stats');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const isEmployeeOnly = userRole === 'Employee';

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${currentUser?.name?.split(' ')[0] ?? 'there'}`}
        description={`${userRole} · Overview of HR and Payroll metrics`}
      />

      {isLoading && (
        <div className="flex justify-center items-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 px-4 py-3 text-sm text-amber-700">
          Could not load live dashboard data: {error}
        </div>
      )}

      {!isLoading && !error && stats && (
        isEmployeeOnly ? (
          <EmployeeDashboard stats={stats} />
        ) : (
          <AdminHrDashboard stats={stats} userRole={userRole} />
        )
      )}
    </div>
  );
}

function AdminHrDashboard({ stats, userRole }) {
  const isAdmin = userRole === 'Admin';
  const latestPayrun = stats.latestPayrun ?? null;
  const payroll = {
    payrunName: latestPayrun?.name ?? null,
    totalGross: latestPayrun?.total_gross ?? 0,
    totalNet: latestPayrun?.total_net ?? 0,
    status: latestPayrun?.status ?? null,
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <StatCard
          label="Total Employees"
          value={stats.totalEmployees ?? 0}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Present Today"
          value={stats.presentToday ?? 0}
          icon={ClipboardCheck}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="On Leave Today"
          value={stats.onLeaveToday ?? 0}
          icon={CalendarDays}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label={isAdmin ? 'Latest Payrun (Net)' : 'Pending Leave Approvals'}
          value={isAdmin ? money(payroll.totalNet) : (stats.pendingLeaveRequests ?? 0)}
          sub={isAdmin ? (payroll.payrunName ?? 'No payrun yet') : 'awaiting approval'}
          icon={isAdmin ? Receipt : CalendarDays}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Pending Leave Approvals</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingLeaveRequests ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">requests awaiting your decision</p>
            </div>
            <Link
              to="/time-off/requests"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Review requests <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Payroll Summary</h2>
          {payroll.payrunName ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Payrun</span>
                <span className="font-medium text-gray-900">{payroll.payrunName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Gross</span>
                <span className="font-medium text-gray-900">{money(payroll.totalGross)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Net</span>
                <span className="font-medium text-gray-900">{money(payroll.totalNet)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <Badge variant="primary">{payroll.status ?? '—'}</Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No payrun processed yet.</p>
          )}
          <Link
            to="/payruns"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            View payruns <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}

function EmployeeDashboard({ stats }) {
  const attendance = stats.todayAttendance ?? {};
  const leaveBalances = stats.leaveBalances ?? [];
  const leave = leaveBalances.reduce(
    (acc, b) => ({
      allocated: acc.allocated + Number(b.approved_amount ?? 0),
      taken: acc.taken + Number(b.taken_amount ?? 0),
      remaining: acc.remaining + Number(b.remaining_amount ?? 0),
    }),
    { allocated: 0, taken: 0, remaining: 0 }
  );
  const rawPayslip = stats.latestPayslip ?? null;
  const payslip = rawPayslip && {
    id: rawPayslip.id,
    netAmount: rawPayslip.net_amount,
    periodLabel: `${rawPayslip.period_start} – ${rawPayslip.period_end}`,
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-gray-900">Today's Attendance</h2>
        </div>
        <p className="text-2xl font-bold text-gray-900">{attendance.status ?? 'Not checked in'}</p>
        {attendance.check_in && (
          <p className="text-xs text-gray-500 mt-1">
            In: {new Date(attendance.check_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            {attendance.check_out && ` · Out: ${new Date(attendance.check_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        )}
        <Link to="/my-attendance" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
          View attendance <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-gray-900">Leave Balance</h2>
        </div>
        <p className="text-2xl font-bold text-gray-900">{leave.remaining ?? 0} days</p>
        <p className="text-xs text-gray-500 mt-1">
          Allocated {leave.allocated ?? 0} · Used {leave.taken ?? 0}
        </p>
        <Link to="/my-time-off" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
          Request time off <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="h-4 w-4 text-violet-600" />
          <h2 className="text-sm font-semibold text-gray-900">Latest Payslip</h2>
        </div>
        {payslip ? (
          <>
            <p className="text-2xl font-bold text-gray-900">{money(payslip.netAmount)}</p>
            <p className="text-xs text-gray-500 mt-1">{payslip.periodLabel ?? ''}</p>
            <Link to={`/payslips/${payslip.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
              View payslip <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">No payslips yet.</p>
            <Link to="/my-payslips" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
              <FileText className="h-4 w-4" /> My payslips
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
