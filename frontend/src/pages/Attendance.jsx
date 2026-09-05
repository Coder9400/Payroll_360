import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { AttendanceFilters } from '../components/attendance/AttendanceFilters';
import { AttendanceTable } from '../components/attendance/AttendanceTable';
import { attendanceService } from '../services/attendanceService';
import { Card } from '../components/ui/Card';
import { Users, UserMinus, Clock, AlertCircle } from 'lucide-react';

export function Attendance() {
  const navigate = useNavigate();
  const [data, setData] = React.useState([]);
  const [metrics, setMetrics] = React.useState({
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    missingCheckout: 0
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [filters, setFilters] = React.useState({
    search: '',
    department: 'All Departments',
    status: 'All Statuses',
    dateRange: 'Today'
  });

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await attendanceService.getAttendance(filters);
      setData(result.data);
      setMetrics(result.metrics);
    } catch (error) {
      console.error("Failed to load attendance", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Attendance"
          description="Track employee attendance, working hours and attendance requests."
        />
        <div className="flex space-x-3">
          <button 
            onClick={() => navigate('/attendance/regularization')}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Regularization Requests
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-green-50 rounded-lg text-green-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Present Today</p>
            <h3 className="text-2xl font-bold text-gray-900">{metrics.presentToday}</h3>
          </div>
        </Card>
        
        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-red-50 rounded-lg text-red-600">
            <UserMinus className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Absent Today</p>
            <h3 className="text-2xl font-bold text-gray-900">{metrics.absentToday}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-yellow-50 rounded-lg text-yellow-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Late Today</p>
            <h3 className="text-2xl font-bold text-gray-900">{metrics.lateToday}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Missing Checkout</p>
            <h3 className="text-2xl font-bold text-gray-900">{metrics.missingCheckout}</h3>
          </div>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
          <AttendanceFilters filters={filters} onFilterChange={handleFilterChange} />
        </div>
        
        <AttendanceTable 
          data={data}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
