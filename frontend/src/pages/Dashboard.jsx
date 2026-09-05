import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, ClipboardCheck, CalendarDays, Receipt, TrendingUp, TrendingDown, Minus, 
  AlertCircle, Briefcase, FileText, CheckCircle2, RefreshCw
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { PageHeader } from '../components/layout/PageHeader';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dashboardService';
import { cn } from '../utils/cn';

const changeTrend = {
  up: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  down: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
  neutral: { icon: Minus, color: 'text-gray-400', bg: 'bg-gray-100' },
};

export function Dashboard() {
  const { currentUser, userRole, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [period, setPeriod] = useState('This Month');
  const [department, setDepartment] = useState('All Departments');

  // Data state
  const [summary, setSummary] = useState(null);
  const [payrollTrend, setPayrollTrend] = useState([]);
  const [salaryByDept, setSalaryByDept] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [recentPayruns, setRecentPayruns] = useState([]);
  const [recentPayslips, setRecentPayslips] = useState([]);

  // Check roles based on Phase 09 requirements
  const isEmployee = userRole === 'Employee';
  const isHRManager = userRole === 'HR Manager';
  const isHRPayrollUser = userRole === 'HR Payroll User';
  const isHRPayrollManager = userRole === 'HR Payroll Manager' || userRole === 'Admin';
  const canViewPayroll = isHRPayrollUser || isHRPayrollManager;

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const filters = { period, department };

      // We only load company-wide stats if NOT a regular Employee
      if (!isEmployee) {
        const [sumRes, trendRes, deptRes, warnRes, runsRes, slipsRes] = await Promise.all([
          dashboardService.getDashboardSummary(filters),
          dashboardService.getPayrollTrend(filters),
          dashboardService.getSalaryByDepartment(filters),
          dashboardService.getPayrollWarnings(filters),
          dashboardService.getRecentPayruns(filters),
          dashboardService.getRecentPayslips(filters)
        ]);
        
        setSummary(sumRes);
        setPayrollTrend(trendRes);
        setSalaryByDept(deptRes);
        setWarnings(warnRes);
        setRecentPayruns(runsRes);
        setRecentPayslips(slipsRes);
      } else {
        // Employee gets personal stats (simulated)
        const [sumRes, slipsRes] = await Promise.all([
          dashboardService.getDashboardSummary(filters),
          dashboardService.getRecentPayslips({ employeeId: currentUser?.id === 'USER-1' ? 'EMP-001' : currentUser?.id })
        ]);
        setSummary(sumRes);
        setRecentPayslips(slipsRes);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, department]);

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Format currency
  const formatCurrency = (val) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
    return `₹${val}`;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <h3 className="text-sm font-medium text-red-800">Unable to load dashboard data</h3>
        <div className="mt-2 text-sm text-red-700">{error}</div>
        <button onClick={() => loadData(true)} className="mt-4 text-sm font-medium text-red-800 underline hover:text-red-900">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <PageHeader
          title={`${greeting}, ${currentUser?.name?.split(' ')[0] ?? 'there'}`}
          description="Overview of your HR and payroll operations"
        />
        
        {/* Global Filters */}
        {!isEmployee && (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="block w-full sm:w-40 rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
            >
              <option>This Month</option>
              <option>Last Month</option>
              <option>This Quarter</option>
              <option>This Year</option>
            </select>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="block w-full sm:w-48 rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
            >
              <option>All Departments</option>
              <option>Engineering</option>
              <option>HR</option>
              <option>Sales</option>
              <option>Marketing</option>
            </select>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              title="Refresh Dashboard"
            >
              <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
            </button>
          </div>
        )}
      </div>

      {/* ── EMPLOYEE VIEW ──────────────────────────────────────────────────────────── */}
      {isEmployee && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="My Attendance" value="Present" subtitle="Checked in at 09:00 AM" icon={ClipboardCheck} color="blue" />
            <KpiCard title="Leave Balance" value="12 Days" subtitle="Annual Leave" icon={CalendarDays} color="emerald" />
            <KpiCard title="Pending Requests" value="0" subtitle="Time Off" icon={CalendarDays} color="amber" />
            <KpiCard title="Last Payslip" value={formatCurrency(summary.payroll.totalNet)} subtitle="Net Salary" icon={Receipt} color="violet" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <QuickActionLink to="/my-attendance" icon={ClipboardCheck} label="Log Attendance" color="bg-blue-50 text-blue-700" />
                <QuickActionLink to="/my-time-off" icon={CalendarDays} label="Request Leave" color="bg-emerald-50 text-emerald-700" />
                <QuickActionLink to="/my-payslips" icon={Receipt} label="View Payslips" color="bg-violet-50 text-violet-700" />
                <QuickActionLink to="/my-profile" icon={Users} label="My Profile" color="bg-amber-50 text-amber-700" />
              </div>
            </div>
            
            <div className="lg:col-span-1 bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Recent Payslips</h3>
              {recentPayslips.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {recentPayslips.map(ps => (
                    <li key={ps.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{ps.payrollPeriod}</p>
                        <p className="text-xs text-gray-500">₹{(ps.net || 0).toLocaleString()}</p>
                      </div>
                      <Link to={`/payroll/payslips/${ps.id}`} className="text-sm text-primary-600 hover:text-primary-900">View</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 py-4 text-center">No recent payslips found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HR / ADMIN VIEW ───────────────────────────────────────────────────────── */}
      {!isEmployee && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Employees</h3>
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.employees.total}</p>
              <div className="mt-2 flex text-xs">
                <span className="text-emerald-600 font-medium">{summary.employees.active} Active</span>
                <span className="text-gray-400 mx-2">•</span>
                <span className="text-blue-600 font-medium">{summary.employees.new} New</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Attendance Today</h3>
                <ClipboardCheck className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.attendance.presentToday}</p>
              <div className="mt-2 flex text-xs">
                <span className="text-red-500 font-medium">{summary.attendance.absentToday} Absent</span>
                <span className="text-gray-400 mx-2">•</span>
                <span className="text-amber-500 font-medium">{summary.attendance.lateToday} Late</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Leave Overview</h3>
                <CalendarDays className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.leave.pendingRequests} Pending</p>
              <div className="mt-2 flex text-xs">
                <span className="text-emerald-600 font-medium">{summary.leave.approved} Approved</span>
                <span className="text-gray-400 mx-2">•</span>
                <span className="text-gray-500 font-medium">{summary.leave.taken} Days Taken</span>
              </div>
            </div>

            {canViewPayroll && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Payroll ({period})</h3>
                  <Receipt className="h-5 w-5 text-violet-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.payroll.totalNet)} Net</p>
                <div className="mt-2 flex text-xs">
                  <span className="text-gray-500 font-medium">{formatCurrency(summary.payroll.totalGross)} Gross</span>
                  <span className="text-gray-400 mx-2">•</span>
                  <span className="text-red-500 font-medium">{formatCurrency(summary.payroll.totalDeductions)} Ded.</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Quick Actions</h3>
            <div className="flex flex-wrap gap-4">
              {hasPermission(['HR Manager', 'HR Payroll Manager', 'Admin']) && (
                <Link to="/employees" className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <Users className="h-4 w-4 mr-2 text-gray-500" /> Add Employee
                </Link>
              )}
              {hasPermission(['HR Manager', 'HR Payroll Manager', 'Admin']) && (
                <Link to="/time-off/requests" className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <CalendarDays className="h-4 w-4 mr-2 text-gray-500" /> Review Leave Requests
                </Link>
              )}
              {canViewPayroll && (
                <Link to="/payroll/payruns/new" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                  <Calculator className="h-4 w-4 mr-2" /> Create Payrun
                </Link>
              )}
              {canViewPayroll && (
                <Link to="/payroll/payslips" className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <FileText className="h-4 w-4 mr-2 text-gray-500" /> Generate Payslips
                </Link>
              )}
              <Link to="/reports" className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Briefcase className="h-4 w-4 mr-2 text-gray-500" /> View Reports
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payroll Trend Chart */}
            {canViewPayroll && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">Monthly Payroll Trend</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={payrollTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={formatCurrency} tick={{fill: '#6b7280', fontSize: 12}} />
                      <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Legend />
                      <Area type="monotone" dataKey="gross" name="Gross Salary" stroke="#10b981" fillOpacity={1} fill="url(#colorGross)" />
                      <Area type="monotone" dataKey="net" name="Net Salary" stroke="#4f46e5" fillOpacity={1} fill="url(#colorNet)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Salary by Department */}
            {canViewPayroll && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">Salary by Department</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salaryByDept} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="department" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={formatCurrency} tick={{fill: '#6b7280', fontSize: 12}} />
                      <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="gross" name="Gross" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="net" name="Net" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payroll Warnings */}
            {canViewPayroll && (
              <div className="lg:col-span-1 bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Payroll Warnings</h3>
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{warnings.length}</span>
                </div>
                {warnings.length > 0 ? (
                  <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {warnings.map(w => (
                      <li key={w.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start">
                          <AlertCircle className={cn("h-5 w-5 mr-3 shrink-0 mt-0.5", w.severity === 'Error' ? 'text-red-500' : 'text-amber-500')} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{w.problem}</p>
                            <p className="text-xs text-gray-500 mt-1">{w.employee} • {new Date(w.date).toLocaleDateString()}</p>
                            <button className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-800">{w.action}</button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">No payroll warnings for this period.</div>
                )}
              </div>
            )}

            {/* Recent Payruns & Payslips */}
            {canViewPayroll && (
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Recent Payruns</h3>
                    <Link to="/payroll/payruns" className="text-xs font-medium text-primary-600 hover:text-primary-800">View All</Link>
                  </div>
                  {recentPayruns.length > 0 ? (
                    <ul className="divide-y divide-gray-200 flex-1 overflow-y-auto">
                      {recentPayruns.map(pr => (
                        <li key={pr.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                          <div>
                            <Link to={`/payroll/payruns/${pr.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-900">{pr.name}</Link>
                            <p className="text-xs text-gray-500 mt-1">{pr.employeeCount} Employees • ₹{(pr.totalNet || 0).toLocaleString()}</p>
                          </div>
                          <span className={cn(
                            "px-2 py-1 inline-flex text-xs font-semibold rounded-full",
                            pr.status === 'Draft' && "bg-gray-100 text-gray-800",
                            pr.status === 'Validated' && "bg-green-100 text-green-800",
                            pr.status === 'Paid' && "bg-purple-100 text-purple-800",
                          )}>{pr.status}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-8 text-center text-gray-500 text-sm">No recent payruns found.</div>
                  )}
                </div>

                <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Recent Payslips</h3>
                    <Link to="/payroll/payslips" className="text-xs font-medium text-primary-600 hover:text-primary-800">View All</Link>
                  </div>
                  {recentPayslips.length > 0 ? (
                    <ul className="divide-y divide-gray-200 flex-1 overflow-y-auto">
                      {recentPayslips.map(ps => (
                        <li key={ps.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                          <div>
                            <Link to={`/payroll/payslips/${ps.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-900">{ps.employeeName}</Link>
                            <p className="text-xs text-gray-500 mt-1">{ps.payslipNumber || ps.id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">₹{(ps.net || 0).toLocaleString()}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{ps.status}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-8 text-center text-gray-500 text-sm">No recent payslips found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Reusable micro-component
function KpiCard({ title, value, subtitle, icon: Icon, color }) {
  const bgMap = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-gray-600">{title}</p>
      <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
    </div>
  );
}

function QuickActionLink({ to, icon: Icon, label, color }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors group">
      <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-2 group-hover:scale-105 transition-transform ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <span className="text-xs font-medium text-gray-700 text-center">{label}</span>
    </Link>
  );
}
