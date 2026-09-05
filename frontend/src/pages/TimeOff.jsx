import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { LeaveRequestTable } from '../components/timeOff/LeaveRequestTable';
import { timeOffService } from '../services/timeOffService';
import { Card } from '../components/ui/Card';
import { Clock, CheckSquare, CalendarDays, PieChart } from 'lucide-react';

export function TimeOff() {
  const navigate = useNavigate();
  const [requests, setRequests] = React.useState([]);
  const [stats, setStats] = React.useState({
    pendingRequests: 0,
    totalAllocated: 0,
    totalUsed: 0,
    totalRemaining: 0
  });
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [recentRequests, dashboardStats] = await Promise.all([
          timeOffService.getLeaveRequests({ status: 'Pending' }),
          timeOffService.getDashboardStats()
        ]);
        // Only show first 5 pending requests on dashboard
        setRequests(recentRequests.slice(0, 5));
        setStats(dashboardStats);
      } catch (error) {
        console.error("Failed to load time off dashboard", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Time Off"
          description="Manage leave requests, allocations, and employee time-off balances."
        />
        <div className="flex space-x-3">
          <button 
            onClick={() => navigate('/time-off/allocations')}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Allocations
          </button>
          <button 
            onClick={() => navigate('/time-off/requests')}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
          >
            Review Requests
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center space-x-4 border-l-4 border-l-yellow-400">
          <div className="p-3 bg-yellow-50 rounded-lg text-yellow-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Pending Requests</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</h3>
          </div>
        </Card>
        
        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <CheckSquare className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Allocated</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalAllocated} <span className="text-sm font-normal text-gray-400">days</span></h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-red-50 rounded-lg text-red-600">
            <PieChart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Used</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalUsed} <span className="text-sm font-normal text-gray-400">days</span></h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-green-50 rounded-lg text-green-600">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Remaining</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalRemaining} <span className="text-sm font-normal text-gray-400">days</span></h3>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Recent Pending Requests</h3>
          <button 
            onClick={() => navigate('/time-off/requests')}
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            View all
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <LeaveRequestTable 
            data={requests}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
