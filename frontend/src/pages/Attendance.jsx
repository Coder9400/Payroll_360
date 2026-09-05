import * as React from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../components/ui/Table";
import { Modal } from "../components/ui/Modal";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import attendanceService from "../services/attendance.service";
import {
  Clock,
  LogIn,
  LogOut,
  CalendarCheck,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  Calendar,
  Sparkles,
  TrendingUp,
  FileCheck,
  RefreshCw,
  XCircle,
} from "lucide-react";

export function Attendance() {
  // Active punch state
  const [currentSession, setCurrentSession] = React.useState(null);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [punchNotes, setPunchNotes] = React.useState("");
  const [isPunching, setIsPunching] = React.useState(false);

  // Tabs: 'history' | 'regularization' | 'overtime'
  const [activeTab, setActiveTab] = React.useState("history");

  // Data states
  const [history, setHistory] = React.useState([]);
  const [regularizations, setRegularizations] = React.useState([]);
  const [overtimeRecords, setOvertimeRecords] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  // Feedback states
  const [errorMessage, setErrorMessage] = React.useState(null);
  const [successMessage, setSuccessMessage] = React.useState(null);

  // Modals
  const [isRegModalOpen, setIsRegModalOpen] = React.useState(false);
  const [selectedAttendance, setSelectedAttendance] = React.useState(null);
  const [regForm, setRegForm] = React.useState({
    requestedCheckIn: "",
    requestedCheckOut: "",
    reason: "",
  });
  const [isSubmittingReg, setIsSubmittingReg] = React.useState(false);

  // Current live time clock
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Elapsed punch timer
  React.useEffect(() => {
    if (!currentSession || currentSession.check_out) {
      setElapsedSeconds(0);
      return;
    }

    const checkInTime = new Date(currentSession.check_in).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - checkInTime) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [currentSession]);

  // Initial load
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [session, historyData, regData, otData] = await Promise.allSettled([
        attendanceService.getCurrentSession(),
        attendanceService.getAttendanceHistory(),
        attendanceService.getRegularizationRequests(),
        attendanceService.getOvertimeRecords(),
      ]);

      if (session.status === "fulfilled") {
        setCurrentSession(session.value || null);
      }
      if (historyData.status === "fulfilled") {
        setHistory(historyData.value || []);
      }
      if (regData.status === "fulfilled") {
        setRegularizations(regData.value || []);
      }
      if (otData.status === "fulfilled") {
        setOvertimeRecords(otData.value || []);
      }
    } catch (err) {
      setErrorMessage(err?.userMessage || "Failed to load attendance records.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Punch In
  const handleCheckIn = async () => {
    setIsPunching(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const now = new Date().toISOString();
      const newSession = await attendanceService.checkIn({
        check_in: now,
        notes: punchNotes || undefined,
      });
      setCurrentSession(newSession);
      setPunchNotes("");
      setSuccessMessage("Punch In successful! Have a productive workday.");
      await loadData();
    } catch (err) {
      setErrorMessage(err?.userMessage || "Check-in failed. Please try again.");
    } finally {
      setIsPunching(false);
    }
  };

  // Handle Punch Out
  const handleCheckOut = async () => {
    setIsPunching(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const now = new Date().toISOString();
      await attendanceService.checkOut({
        check_out: now,
        notes: punchNotes || undefined,
      });
      setCurrentSession(null);
      setPunchNotes("");
      setSuccessMessage("Punch Out successful! Great job today.");
      await loadData();
    } catch (err) {
      setErrorMessage(err?.userMessage || "Check-out failed. Please try again.");
    } finally {
      setIsPunching(false);
    }
  };

  // Open Regularization Modal for a specific row
  const openRegularizationModal = (record) => {
    setSelectedAttendance(record);
    const datePart = (record.date || record.attendance_date || new Date().toISOString().split("T")[0]);
    setRegForm({
      requestedCheckIn: record.check_in ? record.check_in.slice(0, 16) : `${datePart}T09:00`,
      requestedCheckOut: record.check_out ? record.check_out.slice(0, 16) : `${datePart}T18:00`,
      reason: "",
    });
    setIsRegModalOpen(true);
  };

  // Submit Regularization
  const handleRegularizeSubmit = async (e) => {
    e.preventDefault();
    if (!regForm.reason.trim()) {
      setErrorMessage("Please provide a valid reason for regularization.");
      return;
    }
    setIsSubmittingReg(true);
    try {
      await attendanceService.submitRegularization({
        attendance_id: selectedAttendance.id,
        requested_check_in: new Date(regForm.requestedCheckIn).toISOString(),
        requested_check_out: new Date(regForm.requestedCheckOut).toISOString(),
        reason: regForm.reason,
      });
      setIsRegModalOpen(false);
      setSuccessMessage("Regularization request submitted successfully for approval.");
      await loadData();
    } catch (err) {
      setErrorMessage(err?.userMessage || "Failed to submit regularization request.");
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Approve regularization (HR/Manager)
  const handleApprove = async (id) => {
    try {
      await attendanceService.approveRegularization(id);
      setSuccessMessage("Request approved and attendance hours updated.");
      await loadData();
    } catch (err) {
      setErrorMessage(err?.userMessage || "Failed to approve request.");
    }
  };

  // Reject regularization (HR/Manager)
  const handleReject = async (id) => {
    const reason = prompt("Enter rejection reason:") || "Request rejected by manager";
    try {
      await attendanceService.rejectRegularization(id, reason);
      setSuccessMessage("Request rejected successfully.");
      await loadData();
    } catch (err) {
      setErrorMessage(err?.userMessage || "Failed to reject request.");
    }
  };

  // Helpers
  const formatTime = (isoString) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? "-" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? dateString : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return "-";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins > 0 ? `${mins}m` : ""}`;
  };

  const formatElapsed = (sec) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getStatusBadge = (status) => {
    switch ((status || "").toUpperCase()) {
      case "PRESENT":
        return <Badge variant="success">PRESENT</Badge>;
      case "LATE":
        return <Badge variant="warning">LATE</Badge>;
      case "OVERTIME":
        return <Badge variant="primary">OVERTIME</Badge>;
      case "INCOMPLETE":
        return <Badge variant="danger">INCOMPLETE</Badge>;
      case "APPROVED":
        return <Badge variant="success">APPROVED</Badge>;
      case "PENDING":
        return <Badge variant="warning">PENDING</Badge>;
      case "REJECTED":
        return <Badge variant="danger">REJECTED</Badge>;
      default:
        return <Badge variant="default">{status || "UNKNOWN"}</Badge>;
    }
  };

  // Filtered attendance records
  const filteredHistory = React.useMemo(() => {
    if (statusFilter === "ALL") return history;
    return history.filter((r) => (r.status || "").toUpperCase() === statusFilter);
  }, [history, statusFilter]);

  // Aggregate metrics
  const totalOvertimeMinutes = React.useMemo(() => {
    return overtimeRecords.reduce((acc, curr) => acc + (curr.overtime_minutes || 0), 0);
  }, [overtimeRecords]);

  const presentDaysCount = React.useMemo(() => {
    return history.filter((r) => ["PRESENT", "OVERTIME", "LATE"].includes((r.status || "").toUpperCase())).length;
  }, [history]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Attendance & Overtime"
        description="Track your daily work hours, check in/out, view overtime, and request attendance regularization."
        actions={
          <Button variant="secondary" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Alert Banners */}
      {errorMessage && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 border border-red-200 flex items-start justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-3 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700 ml-3">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 border border-green-200 flex items-start justify-between">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-3 text-green-500 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700 ml-3">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Punch Clock Card */}
      <Card className="border-primary-100 bg-gradient-to-br from-white via-primary-50/20 to-white shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Clock Column */}
            <div className="space-y-1 text-center md:text-left">
              <span className="text-xs font-semibold tracking-wider text-primary-600 uppercase">Current Time</span>
              <div className="text-3xl font-extrabold text-gray-900 tracking-tight font-mono">
                {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
              </div>
              <div className="text-xs text-gray-500 flex items-center justify-center md:justify-start">
                <Calendar className="h-3.5 w-3.5 mr-1 text-gray-400" />
                {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </div>
            </div>

            {/* Current Session Indicator */}
            <div className="text-center p-4 rounded-xl bg-white border border-gray-200/80 shadow-xs">
              <span className="text-xs text-gray-500 block mb-1">Active Status</span>
              {currentSession && !currentSession.check_out ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-bold text-gray-900">Punched In</span>
                  </div>
                  <div className="text-2xl font-mono font-extrabold text-primary-600">
                    {formatElapsed(elapsedSeconds)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Checked in at {formatTime(currentSession.check_in)}
                  </div>
                </div>
              ) : (
                <div className="space-y-1 py-1">
                  <div className="flex items-center justify-center text-gray-400 gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium text-gray-600">Not Punched In</span>
                  </div>
                  <p className="text-xs text-gray-400">Ready to begin your workday</p>
                </div>
              )}
            </div>

            {/* Punch Action Buttons */}
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={punchNotes}
                onChange={(e) => setPunchNotes(e.target.value)}
                placeholder="Optional notes (e.g. Work from home)..."
                className="text-xs rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {currentSession && !currentSession.check_out ? (
                <Button
                  variant="danger"
                  size="lg"
                  onClick={handleCheckOut}
                  isLoading={isPunching}
                  className="w-full font-semibold shadow-md"
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  Punch Out
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleCheckIn}
                  isLoading={isPunching}
                  className="w-full font-semibold shadow-md"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Punch In
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Today's Shift</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {currentSession ? getStatusBadge(currentSession.status) : <Badge variant="default">OFF-DUTY</Badge>}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Today's Duration</p>
              <p className="text-lg font-bold text-gray-900 mt-1 font-mono">
                {currentSession && currentSession.check_out
                  ? formatDuration(currentSession.worked_minutes)
                  : currentSession
                  ? formatElapsed(elapsedSeconds)
                  : "0h 0m"}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <Hourglass className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Overtime Logged</p>
              <p className="text-lg font-bold text-gray-900 mt-1 font-mono">
                {formatDuration(totalOvertimeMinutes)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Days Present</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {presentDaysCount} Days
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "history"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Attendance History ({history.length})
          </button>
          <button
            onClick={() => setActiveTab("regularization")}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "regularization"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Regularization Requests ({regularizations.length})
          </button>
          <button
            onClick={() => setActiveTab("overtime")}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "overtime"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Overtime Records ({overtimeRecords.length})
          </button>
        </nav>
      </div>

      {/* TAB 1: Attendance History */}
      {activeTab === "history" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Attendance Log</CardTitle>
              <CardDescription>Verified daily punches, hours worked, and status</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-gray-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="OVERTIME">Overtime</option>
                <option value="INCOMPLETE">Incomplete</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 flex justify-center items-center">
                <Spinner size="lg" />
              </div>
            ) : filteredHistory.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No attendance records found"
                description="Your punches and attendance logs will appear here once recorded."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Worked Duration</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-gray-900">
                        {formatDate(row.date || row.attendance_date)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-700">
                        {formatTime(row.check_in)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-700">
                        {formatTime(row.check_out)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatDuration(row.worked_minutes)}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {row.overtime_minutes > 0 ? (
                          <span className="text-purple-600 font-semibold">+{formatDuration(row.overtime_minutes)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(row.status)}</TableCell>
                      <TableCell className="text-xs text-gray-500 max-w-[150px] truncate">
                        {row.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openRegularizationModal(row)}
                          className="text-xs h-7 px-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                        >
                          Regularize
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: Regularization Requests */}
      {activeTab === "regularization" && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Regularization Requests</CardTitle>
            <CardDescription>Review and track correction requests submitted for missed punches</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 flex justify-center items-center">
                <Spinner size="lg" />
              </div>
            ) : regularizations.length === 0 ? (
              <EmptyState
                icon={FileCheck}
                title="No regularization requests"
                description="Submit a request from the Attendance History tab if you missed a punch."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested Date & Time</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regularizations.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="text-xs font-medium text-gray-900">
                          {formatDate(req.requested_check_in)}
                        </div>
                        <div className="text-xs font-mono text-gray-500">
                          {formatTime(req.requested_check_in)} - {formatTime(req.requested_check_out)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-700 max-w-xs">
                        {req.reason}
                        {req.rejection_reason && (
                          <div className="text-xs text-red-600 mt-1">Rejection note: {req.rejection_reason}</div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {formatDate(req.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === "PENDING" && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(req.id)}
                              className="text-xs h-7 px-2 text-green-700 border-green-300 hover:bg-green-50"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReject(req.id)}
                              className="text-xs h-7 px-2 text-red-600 hover:bg-red-50"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: Overtime Records */}
      {activeTab === "overtime" && (
        <Card>
          <CardHeader>
            <CardTitle>Overtime Logs</CardTitle>
            <CardDescription>Verified excess working hours calculated against scheduled shift requirements</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 flex justify-center items-center">
                <Spinner size="lg" />
              </div>
            ) : overtimeRecords.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No overtime records logged"
                description="Overtime will be automatically recorded when actual worked time exceeds scheduled shift hours."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Worked Hours</TableHead>
                    <TableHead>Scheduled Expected</TableHead>
                    <TableHead>Overtime Recorded</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overtimeRecords.map((ot) => (
                    <TableRow key={ot.id}>
                      <TableCell className="font-medium text-gray-900">
                        {formatDate(ot.date)}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {formatDuration(ot.worked_minutes)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-gray-500">
                        {formatDuration(ot.expected_minutes)}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold text-purple-600">
                        +{formatDuration(ot.overtime_minutes)}
                      </TableCell>
                      <TableCell>{getStatusBadge(ot.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Regularization Modal */}
      <Modal
        isOpen={isRegModalOpen}
        onClose={() => setIsRegModalOpen(false)}
        title="Request Attendance Regularization"
      >
        <form onSubmit={handleRegularizeSubmit} className="space-y-4">
          <p className="text-xs text-gray-500">
            Submit correct punch in and punch out times for review by your manager.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Requested Punch In Time</label>
            <input
              type="datetime-local"
              required
              value={regForm.requestedCheckIn}
              onChange={(e) => setRegForm({ ...regForm, requestedCheckIn: e.target.value })}
              className="w-full text-xs rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Requested Punch Out Time</label>
            <input
              type="datetime-local"
              required
              value={regForm.requestedCheckOut}
              onChange={(e) => setRegForm({ ...regForm, requestedCheckOut: e.target.value })}
              className="w-full text-xs rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Correction</label>
            <textarea
              required
              rows={3}
              value={regForm.reason}
              onChange={(e) => setRegForm({ ...regForm, reason: e.target.value })}
              placeholder="Explain why punch times need to be regularized..."
              className="w-full text-xs rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsRegModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingReg}
            >
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
export default Attendance;
