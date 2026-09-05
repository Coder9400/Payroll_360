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
                  <PlaceholderPage title="My Payslips" description="View your payslips" phase="Phase 07" />
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
                  <PlaceholderPage title="Payruns" description="Process and manage payroll runs" phase="Phase 05" />
                </AuthRoute>
              }
            />
            <Route
              path="payslips"
              element={
                <AuthRoute roles={PAYROLL_ROLES}>
                  <PlaceholderPage title="Payslips" description="View and generate employee payslips" phase="Phase 07" />
                </AuthRoute>
              }
            />
            <Route
              path="salary-structures"
              element={
                <AuthRoute roles={PAYROLL_MGR}>
                  <PlaceholderPage title="Salary Structures" description="Configure salary structures" phase="Phase 05" />
                </AuthRoute>
              }
            />
            <Route
              path="salary-rules"
              element={
                <AuthRoute roles={PAYROLL_MGR}>
                  <PlaceholderPage title="Salary Rules" description="Configure payroll computation rules" phase="Phase 05" />
                </AuthRoute>
              }
            />

            {/* ── Reports ──────────────────────────────────────────── */}
            <Route
              path="reports"
              element={
                <AuthRoute roles={HR_AND_ABOVE}>
                  <PlaceholderPage title="Reports" description="View analytics and payroll reports" phase="Phase 09" />
                </AuthRoute>
              }
            />

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
