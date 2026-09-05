/**
 * Dashboard
 * ─────────
 * Phase 02: Shell with placeholder KPI cards.
 * Real data and charts will be implemented in Phase 09.
 * All figures shown here are PLACEHOLDER / MOCK data only.
 */

import * as React from 'react';
import { Users, ClipboardCheck, CalendarDays, Receipt, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { useAuth } from '../context/AuthContext';

// ─── PLACEHOLDER KPI DATA ─────────────────────────────────────────────────────
// These values are mock data. Replace with real API responses in Phase 09.
const KPI_CARDS = [
  {
    id: 'kpi-total-employees',
    label: 'Total Employees',
    value: '248',
    change: '+12',
    changeType: 'up',
    changeLabel: 'vs. last month',
    icon: Users,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    id: 'kpi-attendance-today',
    label: 'Attendance Today',
    value: '91.4%',
    change: '-2.1%',
    changeType: 'down',
    changeLabel: 'vs. yesterday',
    icon: ClipboardCheck,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    id: 'kpi-pending-leave',
    label: 'Pending Leave',
    value: '14',
    change: '0',
    changeType: 'neutral',
    changeLabel: 'requests awaiting approval',
    icon: CalendarDays,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    id: 'kpi-net-payroll',
    label: 'Net Payroll (Sep)',
    value: '₹24.6L',
    change: '+3.2%',
    changeType: 'up',
    changeLabel: 'vs. last month',
    icon: Receipt,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
];

const changeTrend = {
  up: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  down: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
  neutral: { icon: Minus, color: 'text-gray-400', bg: 'bg-gray-100' },
};
// ─────────────────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { currentUser, userRole } = useAuth();

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${currentUser?.name?.split(' ')[0] ?? 'there'}`}
        description={`${userRole} · Overview of HR and Payroll metrics`}
      />

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {KPI_CARDS.map((card) => {
          const { icon: TrendIcon, color, bg } = changeTrend[card.changeType];
          return (
            <div
              key={card.id}
              id={card.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} aria-hidden="true" />
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${color}`}
                >
                  <TrendIcon className="h-3 w-3" />
                  {card.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="mt-1 text-sm font-medium text-gray-600">{card.label}</p>
              <p className="mt-0.5 text-xs text-gray-400">{card.changeLabel}</p>
            </div>
          );
        })}
      </div>

      {/* ── Placeholder content area ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Activity feed placeholder */}
        <div className="lg:col-span-2 rounded-xl border border-dashed border-gray-200 bg-white p-8 flex flex-col items-center justify-center text-center min-h-[240px]">
          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <ClipboardCheck className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">Attendance & Activity Chart</p>
          <p className="text-xs text-gray-400 mt-1">Will be implemented in Phase 09</p>
        </div>

        {/* Quick stats placeholder */}
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 flex flex-col items-center justify-center text-center min-h-[240px]">
          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <Receipt className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">Payroll Summary</p>
          <p className="text-xs text-gray-400 mt-1">Will be implemented in Phase 09</p>
        </div>
      </div>

      {/* Dev note */}
      {import.meta.env.DEV && (
        <div className="mt-6 rounded-lg border border-dashed border-amber-200 bg-amber-50/40 px-4 py-2 text-xs text-amber-700">
          <strong>DEV:</strong> All KPI values above are placeholder/mock data. Real data integration is Phase 09.
        </div>
      )}
    </div>
  );
}
