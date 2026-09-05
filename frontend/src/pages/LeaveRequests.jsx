import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { LeaveRequestTable } from '../components/timeOff/LeaveRequestTable';
import { timeOffService } from '../services/timeOffService';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

export function LeaveRequests() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialEmployeeId = queryParams.get('employee');

  const [requests, setRequests] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState('Pending');

  const [selectedRequest, setSelectedRequest] = React.useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [rejectionError, setRejectionError] = React.useState('');
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await timeOffService.getLeaveRequests({ 
        status: statusFilter === 'All' ? null : statusFilter,
        employeeId: initialEmployeeId
      });
      setRequests(results);
    } catch (error) {
      console.error("Failed to load requests", error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, initialEmployeeId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReviewClick = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectionError('');
    setIsReviewModalOpen(true);
  };

  const handleApprove = async () => {
    setIsActionLoading(true);
    try {
      await timeOffService.approveLeaveRequest(selectedRequest.id);
      setIsReviewModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error("Failed to approve", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setRejectionError('Rejection reason is required.');
      return;
    }
    setIsActionLoading(true);
    try {
      await timeOffService.rejectLeaveRequest(selectedRequest.id, { reason: rejectionReason });
      setIsReviewModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error("Failed to reject", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Leave Requests"
          description={initialEmployeeId ? `Viewing requests for ${initialEmployeeId}` : "Manage employee leave requests."}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-end">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <Select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
              <option value="All">All Requests</option>
            </Select>
          </div>
        </div>
        
        <LeaveRequestTable 
          data={requests}
          isLoading={isLoading}
          onActionClick={handleReviewClick}
        />
      </div>

      <Modal 
        isOpen={isReviewModalOpen}
        onClose={() => !isActionLoading && setIsReviewModalOpen(false)}
        title="Review Leave Request"
      >
        {selectedRequest && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Employee Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-gray-500">Employee</span>
                  <span className="text-sm font-medium">{selectedRequest.employeeName}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">Department</span>
                  <span className="text-sm font-medium">{selectedRequest.department}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Leave Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-xs text-gray-500">Leave Type</span>
                  <span className="font-medium">{selectedRequest.leaveTypeName}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">Duration</span>
                  <span className="font-medium">{selectedRequest.duration} days</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">Start Date</span>
                  <span className="font-medium">{new Date(selectedRequest.startDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">End Date</span>
                  <span className="font-medium">{new Date(selectedRequest.endDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Reason</h4>
              <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-md border border-blue-100 italic">
                "{selectedRequest.reason}"
              </p>
            </div>

            {selectedRequest.status === 'Pending' && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason (if rejecting)
                </label>
                <textarea
                  className={`w-full rounded-md border shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2.5 ${
                    rejectionError ? "border-red-500" : "border-gray-300"
                  }`}
                  rows="2"
                  placeholder="Required only for rejection..."
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (e.target.value) setRejectionError('');
                  }}
                />
                {rejectionError && <p className="text-red-500 text-xs mt-1">{rejectionError}</p>}

                <div className="flex justify-end space-x-3 mt-4">
                  <Button variant="danger" type="button" onClick={handleReject} isLoading={isActionLoading}>
                    Reject
                  </Button>
                  <Button type="button" onClick={handleApprove} isLoading={isActionLoading}>
                    Approve
                  </Button>
                </div>
              </div>
            )}
            
            {selectedRequest.status !== 'Pending' && (
              <div className="pt-4 border-t border-gray-200 space-y-4">
                <div>
                  <span className="block text-xs text-gray-500">Manager Comment</span>
                  <p className="text-sm mt-1">{selectedRequest.managerComment || 'None'}</p>
                </div>
                <div className="flex justify-between items-center">
                  <Button variant="outline" onClick={() => navigate(`/time-off/requests/${selectedRequest.id}`)}>
                    View Full Detail Page
                  </Button>
                  <Button variant="outline" onClick={() => setIsReviewModalOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
