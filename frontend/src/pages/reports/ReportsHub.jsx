import * as React from 'react';
import { Link } from 'react-router-dom';
import { Users, ClipboardCheck, CalendarDays, Receipt, ChevronRight } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';

const REPORT_CATEGORIES = [
  {
    id: 'employees',
    name: 'Employee Report',
    description: 'Detailed roster of all employees, their departments, managers, and contract statuses.',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    link: '/reports/employees'
  },
  {
    id: 'attendance',
    name: 'Attendance Report',
    description: 'Daily logs of check-ins, check-outs, worked hours, overtime, and lateness.',
    icon: ClipboardCheck,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    link: '/reports/attendance'
  },
  {
    id: 'time-off',
    name: 'Leave Report',
    description: 'Overview of all time-off requests, types of leave taken, and remaining balances.',
    icon: CalendarDays,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    link: '/reports/time-off'
  },
  {
    id: 'payroll',
    name: 'Payroll Report',
    description: 'Comprehensive salary breakdowns, allowances, deductions, and net payouts by period.',
    icon: Receipt,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    link: '/reports/payroll'
  }
];

export function ReportsHub() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Reports Hub"
        description="Access and export analytics across all HR and Payroll modules."
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {REPORT_CATEGORIES.map((category) => (
          <Link
            key={category.id}
            to={category.link}
            className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:border-primary-200"
          >
            <div>
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${category.bgColor} mb-4 group-hover:scale-110 transition-transform`}>
                <category.icon className={`h-6 w-6 ${category.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{category.description}</p>
            </div>
            
            <div className="mt-6 flex items-center text-sm font-medium text-primary-600">
              View Report
              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
