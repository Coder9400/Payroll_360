import * as React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { Dashboard } from "./pages/Dashboard";
import { Employees } from "./pages/Employees";
import { Attendance } from "./pages/Attendance";
import { PlaceholderPage } from "./pages/PlaceholderPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="time-off" element={<PlaceholderPage title="Time Off" description="Manage leaves and absences" />} />
          <Route path="contracts" element={<PlaceholderPage title="Contracts" description="Manage employee contracts" />} />
          <Route path="payroll" element={<PlaceholderPage title="Payroll" description="Process payroll and salaries" />} />
          <Route path="payslips" element={<PlaceholderPage title="Payslips" description="View and generate payslips" />} />
          <Route path="salary-structures" element={<PlaceholderPage title="Salary Structures" description="Configure salary structures" />} />
          <Route path="salary-rules" element={<PlaceholderPage title="Salary Rules" description="Configure computation rules" />} />
          <Route path="reports" element={<PlaceholderPage title="Reports" description="View analytics and reports" />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
