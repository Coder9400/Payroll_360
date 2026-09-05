import * as React from 'react';
import { Clock, CalendarDays, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { Spinner } from '../ui/Spinner';

function StatCard({ label, value, sub, icon: Icon, colorClass }) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon className={`h-5 w-5 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
        <h3 className="text-sm font-medium text-gray-500">{label}</h3>
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export function ProgressStats({ employeeId }) {
  const [stats, setStats] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const data = await employeeService.getEmployeeProgress(employeeId);
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load progress stats');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    if (employeeId) {
      load();
    }
    return () => { cancelled = true; };
  }, [employeeId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Could not load progress stats: {error}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      {/* Last Month Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Performance: {stats.lastMonthLabel}</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            label="Days Present" 
            value={stats.lastMonth?.daysPresent || 0} 
            sub="Total days checked in"
            icon={ClipboardCheck} 
            colorClass="bg-emerald-500 text-emerald-600" 
          />
          <StatCard 
            label="Days Late" 
            value={stats.lastMonth?.daysLate || 0} 
            sub="Arrived after start time"
            icon={AlertTriangle} 
            colorClass="bg-amber-500 text-amber-600" 
          />
          <StatCard 
            label="Overtime" 
            value={`${stats.lastMonth?.overtimeHours || 0} hrs`} 
            sub="Extra hours worked"
            icon={Clock} 
            colorClass="bg-violet-500 text-violet-600" 
          />
          <StatCard 
            label="Leaves Taken" 
            value={stats.lastMonth?.leavesTaken || 0} 
            sub="Approved time off days"
            icon={CalendarDays} 
            colorClass="bg-blue-500 text-blue-600" 
          />
        </div>
      </section>

      {/* Year To Date Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Year To Date (2026)</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            label="Total Days Present" 
            value={stats.ytd?.daysPresent || 0} 
            icon={ClipboardCheck} 
            colorClass="bg-emerald-500 text-emerald-600" 
          />
          <StatCard 
            label="Total Days Late" 
            value={stats.ytd?.daysLate || 0} 
            icon={AlertTriangle} 
            colorClass="bg-amber-500 text-amber-600" 
          />
          <StatCard 
            label="Total Overtime" 
            value={`${stats.ytd?.overtimeHours || 0} hrs`} 
            icon={Clock} 
            colorClass="bg-violet-500 text-violet-600" 
          />
          <StatCard 
            label="Total Leaves Taken" 
            value={stats.ytd?.leavesTaken || 0} 
            icon={CalendarDays} 
            colorClass="bg-blue-500 text-blue-600" 
          />
        </div>
      </section>
    </div>
  );
}
