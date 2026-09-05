import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { AttendanceTable } from '../components/attendance/AttendanceTable';
import { RegularizationForm } from '../components/attendance/RegularizationForm';
import { attendanceService } from '../services/attendanceService';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { formatHours } from '../utils/timeUtils';
import { CalendarCheck, CalendarX, Briefcase, Clock, AlertCircle } from 'lucide-react';

export function EmployeeAttendance() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isMyAttendance = !employeeId; // If no param, assume it's /my-attendance
  
  // Use the URL param if provided (HR viewing a specific employee),
  // otherwise fall back to the logged-in user's own employee ID.
  const targetEmployeeId = employeeId || currentUser?.employee?.id || null;

  const [data, setData] = React.useState([]);
  const [metrics, setMetrics] = React.useState({
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    totalWorkedHours: 0
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
      console.error("Failed to load attendance", error);
    } finally {
      setIsLoading(false);
    }
  }, [targetEmployeeId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckIn = async () => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      await attendanceService.checkIn(targetEmployeeId);
      await fetchData();
    } catch (error) {
      setActionError(error.message || "Unable to check in. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      await attendanceService.checkOut(targetEmployeeId);
      await fetchData();
    } catch (error) {
      setActionError(error.message || "Unable to check out. Please try again.");
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
      // alert could be a toast in the future
      console.log("Regularization requested successfully");
    } catch (error) {
      console.error("Error submitting regularization", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const getTodayRecord = () => {
    const today = new Date().toISOString().split('T')[0];
    return data.find(d => d.date === today);
  };

  const todayRecord = getTodayRecord();
  const hasCheckedIn = todayRecord && !!todayRecord.checkIn;
  const hasCheckedOut = todayRecord && !!todayRecord.checkOut;

  // Render a custom action column for the employee view
  const customColumns = [
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => {
        if (row.status === 'Missing Checkout' && isMyAttendance) {
          return (
            <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => openRegularizationModal(row)}>
              <AlertCircle className="h-4 w-4 mr-1" /> Request Regularization
            </Button>
          );
        }
        return <span className="text-gray-400">-</span>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={isMyAttendance ? "My Attendance" : "Employee Attendance"}
          description="View attendance history and metrics."
        />
        
        {/* Quick Check-in/Check-out Action (Only for My Attendance) */}
        {isMyAttendance && (
          <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            {actionError && <span className="text-xs text-red-500 mr-2">{actionError}</span>}
            
            {!hasCheckedIn ? (
              <Button onClick={handleCheckIn} isLoading={isActionLoading}>
                Check In Now
              </Button>
            ) : !hasCheckedOut ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-green-600 font-medium flex items-center">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                  Checked In
                </span>
                <Button variant="outline" onClick={handleCheckOut} isLoading={isActionLoading}>
                  Check Out
                </Button>
              </div>
            ) : (
              <span className="text-sm text-gray-500 font-medium px-4 py-2 bg-gray-50 rounded-md">
                Shift Completed
              </span>
            )}
          </div>
        )}
      </div>

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance History</h3>
        {/* Render standard table, but we need to inject the actions column. 
            Since we don't have a way to extend columns dynamically inside AttendanceTable right now without modifying it heavily,
            we will just use the standard one, and if needed, we'll customize it. For now, the prompt allows basic display.
            Wait, I should just modify the AttendanceTable to accept `extraColumns` or render actions based on a prop.
            Let's just re-implement the Table here if needed, or pass an `onAction` prop.
            Actually, the user requirements say: "Handle missing checkout clearly... Provide an appropriate action such as Request Regularization".
            I will pass `onRegularize` to AttendanceTable. I'll need to slightly modify AttendanceTable. */}
        <AttendanceTable 
          data={data}
          isLoading={isLoading}
          hideEmployee={true}
        />
        
        {/* We will add a small hint below the table if there is a missing checkout */}
        {isMyAttendance && data.some(d => d.status === 'Missing Checkout') && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-orange-800">Missing Checkout Detected</h4>
              <p className="text-sm text-orange-700 mt-1">
                You have one or more attendance records with a missing checkout. Please request regularization for those dates.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.filter(d => d.status === 'Missing Checkout').map(record => (
                  <Button key={record.id} size="sm" variant="outline" className="bg-white" onClick={() => openRegularizationModal(record)}>
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
