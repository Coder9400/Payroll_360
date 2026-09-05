/**
 * TodayAttendancePanel
 * ─────────────────────
 * Reusable panel: every employee's clock-in / clock-out for today.
 * Used in Attendance.jsx (full) and Dashboard.jsx (mini widget, limit=5).
 *
 * Props:
 *   limit       — max rows to show (default = show all)
 *   showFooter  — show summary footer (default true)
 *   autoRefresh — poll interval ms; 0 = off (default 0)
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw, Clock, LogIn, LogOut } from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { formatTime, formatHours } from '../../utils/timeUtils';
import { cn } from '../../utils/cn';

const STATUS_PILL = {
  Present:            'bg-emerald-50 text-emerald-700',
  Late:               'bg-amber-50 text-amber-700',
  Overtime:           'bg-blue-50 text-blue-700',
  'Half Day':         'bg-yellow-50 text-yellow-700',
  'Missing Checkout': 'bg-orange-50 text-orange-700',
  Corrected:          'bg-gray-100 text-gray-600',
};

/** Elapsed seconds → "Xh Ym" */
function fmtElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Live counter for employees still clocked in — updates every 60 s */
function ElapsedTimer({ checkInIso }) {
  const startMs = React.useMemo(() => new Date(checkInIso).getTime(), [checkInIso]);
  const [secs, setSecs] = React.useState(() => Math.floor((Date.now() - startMs) / 1000));
  React.useEffect(() => {
    const id = setInterval(() => setSecs(Math.floor((Date.now() - startMs) / 1000)), 60_000);
    return () => clearInterval(id);
  }, [startMs]);
  return <span className="text-[10px] text-orange-600 font-medium">{fmtElapsed(secs)} so far</span>;
}

function EmployeeRow({ record }) {
  const isStillIn = record.checkIn && !record.checkOut;
  const initials = (record.employeeName || '?')
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
      {/* Avatar */}
      <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
        {initials}
      </div>

      {/* Name + dept */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{record.employeeName || '—'}</p>
        {record.department && (
          <p className="text-xs text-gray-400 truncate">{record.department}</p>
        )}
      </div>

      {/* Check-in / Check-out times */}
      <div className="flex flex-col items-start gap-0.5">
        <div className="flex items-center gap-1">
          <LogIn className="h-3 w-3 text-emerald-500 shrink-0" />
          <span className="text-xs font-medium text-gray-700">{formatTime(record.checkIn)}</span>
        </div>
        <div className="flex items-center gap-1">
          <LogOut className="h-3 w-3 text-red-400 shrink-0" />
          <span className={cn('text-xs font-medium', record.checkOut ? 'text-gray-700' : 'text-gray-300')}>
            {record.checkOut ? formatTime(record.checkOut) : '—'}
          </span>
        </div>
      </div>

      {/* Hours / live timer / status */}
      <div className="flex flex-col items-end gap-1 min-w-[88px]">
        {record.checkOut ? (
          <span className="text-xs font-semibold text-gray-800">{formatHours(record.workedHours)}</span>
        ) : isStillIn ? (
          <ElapsedTimer checkInIso={record.checkIn} />
        ) : null}
        {record.status && (
          <span className={cn(
            'inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-medium whitespace-nowrap',
            STATUS_PILL[record.status] ?? 'bg-gray-100 text-gray-600'
          )}>
            {record.status}
          </span>
        )}
      </div>
    </div>
  );
}

function SkeletonRows({ n = 3 }) {
  return (
    <div className="space-y-2 px-5 py-3 animate-pulse">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 rounded w-2/5" />
            <div className="h-2 bg-gray-100 rounded w-1/5" />
          </div>
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

export function TodayAttendancePanel({ limit, showFooter = true, autoRefresh = 0 }) {
  const today = new Date().toISOString().split('T')[0];
  const [records, setRecords] = React.useState([]);
  const [isLoading, setIsLoading]     = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastRefresh, setLastRefresh] = React.useState(null);

  const load = React.useCallback(async (spinner = false) => {
    if (spinner) setIsRefreshing(true);
    try {
      const result = await attendanceService.getAttendance({
        date_from: today,
        date_to: today,
        limit: 200,
      });
      setRecords(result.data ?? []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('TodayAttendancePanel:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [today]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => load(), autoRefresh);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const displayed      = limit ? records.slice(0, limit) : records;
  const totalIn        = records.filter(r => r.checkIn).length;
  const stillWorking   = records.filter(r => r.checkIn && !r.checkOut).length;
  const totalHours     = records.reduce((s, r) => s + (r.workedHours ?? 0), 0);
  const checkedOut     = records.filter(r => r.checkOut).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-gray-900">Today's Activity</h3>
          {lastRefresh && (
            <span className="text-[10px] text-gray-400">
              Updated {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={isRefreshing}
          title="Refresh"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Summary bar */}
      {!isLoading && (
        <div className="flex items-center gap-4 px-5 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-600 flex-wrap">
          <span>
            <span className="font-semibold text-emerald-700">{totalIn}</span> clocked in
          </span>
          <span className="text-gray-300" aria-hidden>|</span>
          <span>
            <span className="font-semibold text-orange-600">{stillWorking}</span> still working
          </span>
          <span className="text-gray-300" aria-hidden>|</span>
          <span>
            <span className="font-semibold text-blue-700">{formatHours(totalHours)}</span> total org hrs
          </span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <SkeletonRows n={limit ?? 3} />
      ) : displayed.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">
          No attendance records for today yet.
        </div>
      ) : (
        <div className="px-5">
          {displayed.map(r => <EmployeeRow key={r.id} record={r} />)}
        </div>
      )}

      {/* Footer */}
      {showFooter && !isLoading && records.length > 0 && (
        <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/60">
          {limit && records.length > limit ? (
            <Link
              to="/attendance"
              className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              View all {records.length} records today <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <p className="text-xs text-gray-400">
              {checkedOut} of {totalIn} employees have checked out
            </p>
          )}
        </div>
      )}
    </div>
  );
}
