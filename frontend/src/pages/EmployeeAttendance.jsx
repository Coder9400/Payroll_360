import * as React from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { AttendanceTable } from '../components/attendance/AttendanceTable';
import { RegularizationForm } from '../components/attendance/RegularizationForm';
import { attendanceService } from '../services/attendanceService';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { formatHours } from '../utils/timeUtils';
import { CalendarCheck, CalendarX, Briefcase, Clock, AlertCircle, LogIn, LogOut } from 'lucide-react';
import { cn } from '../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// ClockWidget
// ─────────────────────────────────────────────────────────────────────────────

/** Returns elapsed H h M m string given a check-in ISO string */
function useElapsed(checkInIso) {
  const startMs = checkInIso ? new Date(checkInIso).getTime() : 0;
  const [secs, setSecs] = React.useState(() => (checkInIso ? Math.floor((Date.now() - startMs) / 1000) : 0));
  React.useEffect(() => {
    if (!checkInIso) return;
    const id = setInterval(() => setSecs(Math.floor((Date.now() - startMs) / 1000)), 10_000);
    return () => clearInterval(id);
  }, [checkInIso, startMs]);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

function LiveClock() {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="tabular-nums font-semibold tracking-tight">
      {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

function ClockWidget({ todayRecord, onCheckIn, onCheckOut, isLoading, error }) {
  const hasCheckedIn  = !!todayRecord?.checkIn;
  const hasCheckedOut = !!todayRecord?.checkOut;
  const elapsed       = useElapsed(hasCheckedIn && !hasCheckedOut ? todayRecord?.checkIn : null);

  const checkInTime  = todayRecord?.checkIn
    ? new Date(todayRecord.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null;
  const checkOutTime = todayRecord?.checkOut
    ? new Date(todayRecord.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Top gradient bar */}
      <div className={cn(
        'h-1.5 w-full',
        !hasCheckedIn
          ? 'bg-gray-200'
          : !hasCheckedOut
            ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 animate-pulse'
            : 'bg-gradient-to-r from-blue-400 to-blue-500'
      )} />

      <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Left — live clock + date */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-3xl text-gray-900">
            <Clock className="h-6 w-6 text-primary-500 shrink-0" />
            <LiveClock />
          </div>
          <p className="text-sm text-gray-400 mt-0.5 ml-8">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-14 bg-gray-200" />

        {/* Middle — status */}
        <div className="flex-1">
          {!hasCheckedIn && (
            <p className="text-sm font-medium text-gray-500">
              You haven't checked in yet today.
            </p>
          )}
          {hasCheckedIn && !hasCheckedOut && (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-semibold text-emerald-700">Checked in at {checkInTime}</p>
              </div>
              <p className="text-xs text-gray-500 ml-4">
                Working for <span className="font-semibold text-gray-700">{elapsed}</span>
              </p>
            </div>
          )}
          {hasCheckedOut && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <LogIn className="h-4 w-4 text-emerald-500" />
                <p className="text-sm text-gray-700">
                  Checked in: <span className="font-semibold">{checkInTime}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <LogOut className="h-4 w-4 text-red-400" />
                <p className="text-sm text-gray-700">
                  Checked out: <span className="font-semibold">{checkOutTime}</span>
                </p>
              </div>
              {todayRecord?.workedHours && (
                <p className="text-xs text-gray-500 ml-5">
                  Total worked: <span className="font-semibold text-gray-700">{formatHours(todayRecord.workedHours)}</span>
                </p>
              )}
            </div>
          )}
          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
        </div>

        {/* Right — action button */}
        <div className="flex-shrink-0">
          {!hasCheckedIn ? (
            <Button
              id="btn-check-in"
              onClick={onCheckIn}
              isLoading={isLoading}
              className="min-w-[140px] text-base py-3 gap-2"
            >
              <LogIn className="h-4 w-4" /> Clock In
            </Button>
          ) : !hasCheckedOut ? (
            <Button
              id="btn-check-out"
              variant="outline"
              onClick={onCheckOut}
              isLoading={isLoading}
              className="min-w-[140px] text-base py-3 gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <LogOut className="h-4 w-4" /> Clock Out
            </Button>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700">
              ✓ Shift complete
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmployeeAttendance page
// ─────────────────────────────────────────────────────────────────────────────

export function EmployeeAttendance() {
  const { employeeId } = useParams();
  const { currentUser } = useAuth();
  const isMyAttendance = !employeeId;

  const targetEmployeeId = employeeId || currentUser?.employee?.id || null;

  const [data, setData] = React.useState([]);
  const [metrics, setMetrics] = React.useState({
    presentDays: 0, absentDays: 0, leaveDays: 0, totalWorkedHours: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isActionLoading, setIsActionLoading] = React.useState(false);
  const [actionError, setActionError] = React.useState(null);

  const [isRegModalOpen, setIsRegModalOpen] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState(null);

  const fetchData = React.useCallback(async () => {
    if (!targetEmployeeId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const result = await attendanceService.getEmployeeAttendance(targetEmployeeId);
      setData(result.data);
      setMetrics(result.metrics);
    } catch (error) {
      console.error('Failed to load attendance', error);
    } finally {
      setIsLoading(false);
    }
  }, [targetEmployeeId]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const getTodayRecord = () => {
    const today = new Date().toISOString().split('T')[0];
    return data.find(d => d.date === today) ?? null;
  };

  const todayRecord    = getTodayRecord();
  const hasCheckedIn   = !!todayRecord?.checkIn;
  const hasCheckedOut  = !!todayRecord?.checkOut;

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            reject(new Error('Unable to retrieve your location. Please allow location access.'));
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    });
  };

  const handleCheckIn = async () => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const { lat, lng } = await getLocation();
      await attendanceService.checkIn(targetEmployeeId, null, lat, lng);
      await fetchData();
    } catch (error) {
      // Extract clean message from axios error or direct error
      const msg = error?.response?.data?.error?.message
        || error?.response?.data?.message
        || error?.message
        || 'Unable to check in. Please try again.';
      setActionError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const { lat, lng } = await getLocation();
      await attendanceService.checkOut(targetEmployeeId, null, lat, lng);
      await fetchData();
    } catch (error) {
      const msg = error?.response?.data?.error?.message
        || error?.response?.data?.message
        || error?.message
        || 'Unable to check out. Please try again.';
      setActionError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const openRegularizationModal = (record) => {
    setSelectedRecord(record);
    setIsRegModalOpen(true);
  };

  const submitRegularization = async (formData) => {
    setIsActionLoading(true);
    try {
      await attendanceService.createRegularization({
        ...formData,
        employeeName: currentUser?.name ?? 'Employee',
      });
      setIsRegModalOpen(false);
    } catch (error) {
      console.error('Error submitting regularization', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isMyAttendance ? 'My Attendance' : 'Employee Attendance'}
        description={isMyAttendance
          ? 'Clock in / out and view your attendance history.'
          : 'View attendance history and metrics for this employee.'}
      />

      {/* Hero clock widget — only for the employee's own attendance view */}
      {isMyAttendance && (
        <ClockWidget
          todayRecord={todayRecord}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          isLoading={isActionLoading}
          error={actionError}
        />
      )}

      {/* KPI summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Present Days</p>
            <h3 className="text-2xl font-bold text-gray-900">{metrics.presentDays}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-red-50 rounded-lg text-red-600">
            <CalendarX className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Absent Days</p>
            <h3 className="text-2xl font-bold text-gray-900">{metrics.absentDays}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Leave Days</p>
            <h3 className="text-2xl font-bold text-gray-900">{metrics.leaveDays}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-green-50 rounded-lg text-green-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Worked</p>
            <h3 className="text-2xl font-bold text-gray-900">{formatHours(metrics.totalWorkedHours)}</h3>
          </div>
        </Card>
      </div>

      {/* Attendance history table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance History</h3>
        <AttendanceTable data={data} isLoading={isLoading} hideEmployee={true} />

        {/* Missing-checkout warning */}
        {isMyAttendance && data.some(d => d.status === 'Missing Checkout') && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 mr-3 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-orange-800">Missing Checkout Detected</h4>
              <p className="text-sm text-orange-700 mt-1">
                You have one or more records with a missing checkout. Request regularization for those dates.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.filter(d => d.status === 'Missing Checkout').map(record => (
                  <Button
                    key={record.id}
                    size="sm"
                    variant="outline"
                    className="bg-white"
                    onClick={() => openRegularizationModal(record)}
                  >
                    Regularize {new Date(record.date).toLocaleDateString()}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isRegModalOpen}
        onClose={() => !isActionLoading && setIsRegModalOpen(false)}
        title="Request Regularization"
      >
        <RegularizationForm
          record={selectedRecord}
          onSubmit={submitRegularization}
          onCancel={() => setIsRegModalOpen(false)}
          isLoading={isActionLoading}
        />
      </Modal>
    </div>
  );
}

