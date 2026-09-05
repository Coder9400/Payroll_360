import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { timeOffService } from '../services/timeOffService';
import { LeaveRequestStatusBadge } from '../components/timeOff/LeaveRequestTable';
import { Button } from '../components/ui/Button';

export function LeaveRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = React.useState(null);
  const [balance, setBalance] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    async function loadRequest() {
      setIsLoading(true);
      try {
        const data = await timeOffService.getLeaveRequest(id);
        setRequest(data);
        if (data?.employeeId) {
          const balances = await timeOffService.getEmployeeLeaveBalance(data.employeeId);
          setBalance(balances.find(b => b.leaveTypeId === data.leaveTypeId) ?? null);
        }
      } catch (err) {
        setError("Failed to load request.");
      } finally {
        setIsLoading(false);
      }
    }
    loadRequest();
  }, [id]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading request details...</div>;
  }

  if (error || !request) {
    return (
      <div className="space-y-6">
        <PageHeader title="Leave Request Not Found" />
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-500">
          The requested leave record could not be found.
          <div className="mt-4">
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4 mb-4">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900">
          &larr; Back
        </button>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Leave Request: {request.id}</h2>
          <p className="text-sm text-gray-500">Submitted on {new Date(request.submittedAt).toLocaleString()}</p>
        </div>
        <div>
          <LeaveRequestStatusBadge status={request.status} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Request Information</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-500">Employee</label>
            <div className="mt-1 text-sm text-gray-900">{request.employeeName}</div>
            <div className="text-xs text-gray-500">{request.employeeId}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Department</label>
            <div className="mt-1 text-sm text-gray-900">{request.department}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Leave Type</label>
            <div className="mt-1 text-sm font-medium text-gray-900">{request.leaveTypeName}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Duration</label>
            <div className="mt-1 text-sm text-gray-900">{request.duration} days</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Start Date</label>
            <div className="mt-1 text-sm text-gray-900">{new Date(request.startDate).toLocaleDateString()}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">End Date</label>
            <div className="mt-1 text-sm text-gray-900">{new Date(request.endDate).toLocaleDateString()}</div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500">Reason</label>
            <div className="mt-2 text-sm text-gray-900 bg-gray-50 p-4 rounded-md border border-gray-200">
              {request.reason}
            </div>
          </div>
        </div>
      </div>

      {balance && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Leave Balance — {request.leaveTypeName}</h3>
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <span className="block text-xs text-gray-500">Allocated</span>
              <span className="text-xl font-bold text-gray-900">{balance.allocated}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Used</span>
              <span className="text-xl font-bold text-gray-900">{balance.used}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">This Request</span>
              <span className="text-xl font-bold text-blue-600">{request.duration}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Remaining</span>
              <span className={`text-xl font-bold ${balance.remaining < request.duration ? 'text-red-600' : 'text-green-600'}`}>
                {balance.remaining}
              </span>
            </div>
          </div>
        </div>
      )}

      {(request.status === 'Approved' || request.status === 'Rejected') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Manager Review</h3>
          </div>
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-500">Comment</label>
            <div className="mt-2 text-sm text-gray-900 bg-gray-50 p-4 rounded-md border border-gray-200">
              {request.managerComment || 'No comment provided.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
