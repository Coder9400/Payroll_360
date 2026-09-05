import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleGuard } from './routes/RoleGuard';

// Layout
import { MainLayout } from './layouts/MainLayout';

// Public pages
import { Login } from './pages/Login';
import { AccessDenied } from './pages/AccessDenied';

// App pages
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { EmployeeDetail } from './pages/EmployeeDetail';
import { Attendance } from './pages/Attendance';
import { EmployeeAttendance } from './pages/EmployeeAttendance';
import { AttendanceRegularization } from './pages/AttendanceRegularization';
import { MyTimeOff } from './pages/MyTimeOff';
import { TimeOff } from './pages/TimeOff';
import { LeaveRequests } from './pages/LeaveRequests';
import { LeaveRequestDetail } from './pages/LeaveRequestDetail';
import { LeaveAllocations } from './pages/LeaveAllocations';
import { LeaveTypes } from './pages/LeaveTypes';
import { Contracts } from './pages/Contracts';
import { ContractDetail } from './pages/ContractDetail';
import { WorkingSchedules } from './pages/WorkingSchedules';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { MyPayslips } from './pages/MyPayslips';

// Payroll pages
import { PayrollDashboard } from './pages/payroll/PayrollDashboard';
import { PayrunsList } from './pages/payroll/PayrunsList';
import { PayrunCreate } from './pages/payroll/PayrunCreate';
import { PayrunDetail } from './pages/payroll/PayrunDetail';
import { StructuresList } from './pages/payroll/StructuresList';
import { StructureForm } from './pages/payroll/StructureForm';
import { StructureDetail } from './pages/payroll/StructureDetail';
import { RulesList } from './pages/payroll/RulesList';
import { RuleForm } from './pages/payroll/RuleForm';
import { PayslipsList } from './pages/payroll/PayslipsList';
import { PayslipDetail } from './pages/payroll/PayslipDetail';

// Reports pages
import { ReportsHub } from './pages/reports/ReportsHub';
import { EmployeeReport } from './pages/reports/EmployeeReport';
import { AttendanceReport } from './pages/reports/AttendanceReport';
import { TimeOffReport } from './pages/reports/TimeOffReport';
import { PayrollReport } from './pages/reports/PayrollReport';

// ─── Role constants ────────────────────────────────────────────────────────────
const R = {
  EMPLOYEE: 'Employee',
  HR_MANAGER: 'HR Manager',
  HR_PAYROLL_USER: 'HR Payroll User',
  HR_PAYROLL_MANAGER: 'HR Payroll Manager',
  ADMIN: 'Admin',
};
const ALL = Object.values(R);
const HR_AND_ABOVE = [R.HR_MANAGER, R.HR_PAYROLL_USER, R.HR_PAYROLL_MANAGER, R.ADMIN];
const PAYROLL_ROLES = [R.HR_PAYROLL_USER, R.HR_PAYROLL_MANAGER, R.ADMIN];
const PAYROLL_MGR = [R.HR_PAYROLL_MANAGER, R.ADMIN];
const HR_MGR_ROLES = [R.HR_MANAGER, R.HR_PAYROLL_MANAGER, R.ADMIN];
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Convenience wrapper — ProtectedRoute + RoleGuard in one.
 * IMPORTANT: Frontend authorization is for UX/navigation only.
 * The backend MUST enforce actual authorization on every API endpoint.
 */
function AuthRoute({ roles, children }) {
  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={roles}>{children}</RoleGuard>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public routes ──────────────────────────────────────────── */}
          <Route path="/login" element={<Login />} />
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* ── Protected app shell ────────────────────────────────────── */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Root → Dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Dashboard — all authenticated roles */}
            <Route
              path="dashboard"
              element={
                <AuthRoute roles={ALL}>
                  <Dashboard />
                </AuthRoute>
              }
            />

            {/* ── Employee self-service ─────────────────────────────── */}
            <Route
              path="my-profile"
              element={
                <AuthRoute roles={[R.EMPLOYEE]}>
                  <PlaceholderPage title="My Profile" description="View and update your personal information" phase="Phase 03" />
                </AuthRoute>
              }
            />
            <Route
              path="my-attendance"
              element={
                <AuthRoute roles={[R.EMPLOYEE]}>
                  <EmployeeAttendance />
                </AuthRoute>
              }
            />
            <Route
              path="my-time-off"
              element={
                <AuthRoute roles={[R.EMPLOYEE]}>
                  <MyTimeOff />
                </AuthRoute>
              }
            />
            <Route
              path="my-payslips"
              element={
                <AuthRoute roles={[R.EMPLOYEE]}>
                  <MyPayslips />
                </AuthRoute>
              }
            />

            {/* ── People ────────────────────────────────────────────── */}
            <Route
              path="employees"
              element={
                <AuthRoute roles={HR_AND_ABOVE}>
                  <Employees />
                </AuthRoute>
              }
            />
            <Route
              path="employees/:id"
              element={
                <AuthRoute roles={HR_AND_ABOVE}>
                  <EmployeeDetail />
                </AuthRoute>
              }
            />
            <Route
              path="contracts"
              element={
                <AuthRoute roles={HR_MGR_ROLES}>
                  <Contracts />
                </AuthRoute>
              }
            />
            <Route
              path="contracts/:id"
              element={
                <AuthRoute roles={HR_MGR_ROLES}>
                  <ContractDetail />
                </AuthRoute>
              }
            />
            <Route
              path="schedules"
              element={
                <AuthRoute roles={HR_MGR_ROLES}>
                  <WorkingSchedules />
                </AuthRoute>
              }
            />

            {/* ── Attendance (HR+ only) ─────────────────────────────── */}
            <Route
              path="attendance"
              element={
                <AuthRoute roles={HR_AND_ABOVE}>
                  <Attendance />
                </AuthRoute>
              }
            />
            <Route
              path="attendance/:employeeId"
              element={
                <AuthRoute roles={HR_AND_ABOVE}>
                  <EmployeeAttendance />
                </AuthRoute>
              }
            />
            <Route
              path="attendance/regularization"
              element={
                <AuthRoute roles={HR_AND_ABOVE}>
                  <AttendanceRegularization />
                </AuthRoute>
              }
            />

            {/* ── Time Off ─────────────────────────────────────────── */}
            <Route
              path="time-off"
              element={
                <AuthRoute roles={HR_AND_ABOVE}>
                  <TimeOff />
                </AuthRoute>
              }
            />
            <Route
              path="time-off/requests"
              element={
                <AuthRoute roles={HR_AND_ABOVE}>
                  <LeaveRequests />
                </AuthRoute>
              }
            />
            <Route
              path="time-off/requests/:id"
              element={
                <AuthRoute roles={HR_AND_ABOVE}>
                  <LeaveRequestDetail />
                </AuthRoute>
              }
            />
            <Route
              path="time-off/allocations"
              element={
                <AuthRoute roles={HR_AND_ABOVE}>
                  <LeaveAllocations />
                </AuthRoute>
              }
            />
            <Route
              path="time-off/types"
              element={
                <AuthRoute roles={[R.HR_MANAGER, R.ADMIN]}>
                  <LeaveTypes />
                </AuthRoute>
              }
            />

            {/* ── Payroll ──────────────────────────────────────────── */}
            <Route
              path="payroll"
              element={
                <AuthRoute roles={PAYROLL_ROLES}>
                  <PayrollDashboard />
                </AuthRoute>
              }
            />
            <Route
              path="payroll/payslips"
              element={
                <AuthRoute roles={PAYROLL_ROLES}>
                  <PayslipsList />
                </AuthRoute>
              }
            />
            <Route
              path="payroll/payslips/:id"
              element={
                <AuthRoute roles={PAYROLL_ROLES}>
                  <PayslipDetail />
                </AuthRoute>
              }
            />
            <Route
              path="payroll/payruns"
              element={
                <AuthRoute roles={PAYROLL_ROLES}>
                  <PayrunsList />
                </AuthRoute>
              }
            />
            <Route
              path="payroll/payruns/new"
              element={
                <AuthRoute roles={PAYROLL_ROLES}>
                  <PayrunCreate />
                </AuthRoute>
              }
            />
            <Route
              path="payroll/payruns/:id"
              element={
                <AuthRoute roles={PAYROLL_ROLES}>
                  <PayrunDetail />
                </AuthRoute>
              }
            />
            <Route
              path="payroll/structures"
              element={
                <AuthRoute roles={PAYROLL_MGR}>
                  <StructuresList />
                </AuthRoute>
              }
            />
            <Route
              path="payroll/structures/new"
              element={
                <AuthRoute roles={PAYROLL_MGR}>
                  <StructureForm />
                </AuthRoute>
              }
            />
            <Route
              path="payroll/structures/:id"
              element={
                <AuthRoute roles={PAYROLL_MGR}>
                  <StructureDetail />
                </AuthRoute>
              }
            />
            <Route
              path="payroll/structures/:id/edit"
              element={
                <AuthRoute roles={PAYROLL_MGR}>
                  <StructureForm />
                </AuthRoute>
              }
            />
            <Route
              path="payroll/rules"
              element={
                <AuthRoute roles={PAYROLL_MGR}>
                  <RulesList />
                </AuthRoute>
              }
            />
            <Route
              path="payroll/rules/new"
              element={
                <AuthRoute roles={PAYROLL_MGR}>
                  <RuleForm />
                </AuthRoute>
              }
            />
            <Route
              path="payroll/rules/:id/edit"
              element={
                <AuthRoute roles={PAYROLL_MGR}>
                  <RuleForm />
                </AuthRoute>
              }
            />

            {/* ── Reports ──────────────────────────────────────────── */}
            <Route path="reports">
              <Route index element={<AuthRoute roles={HR_AND_ABOVE}><ReportsHub /></AuthRoute>} />
              <Route path="employees" element={<AuthRoute roles={HR_AND_ABOVE}><EmployeeReport /></AuthRoute>} />
              <Route path="attendance" element={<AuthRoute roles={HR_AND_ABOVE}><AttendanceReport /></AuthRoute>} />
              <Route path="time-off" element={<AuthRoute roles={HR_AND_ABOVE}><TimeOffReport /></AuthRoute>} />
              <Route path="payroll" element={<AuthRoute roles={HR_AND_ABOVE}><PayrollReport /></AuthRoute>} />
            </Route>

            {/* 404 within app → dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Catch-all → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
