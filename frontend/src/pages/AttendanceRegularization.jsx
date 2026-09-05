import * as React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { RegularizationTable } from '../components/attendance/RegularizationTable';
import { attendanceService } from '../services/attendanceService';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { formatTime } from '../utils/timeUtils';
import { Select } from '../components/ui/Select';

export function AttendanceRegularization() {
  const [data, setData] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isActionLoading, setIsActionLoading] = React.useState(false);
  const [filter, setFilter] = React.useState('Pending');

  const [selectedRequest, setSelectedRequest] = React.useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [rejectionError, setRejectionError] = React.useState('');

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await attendanceService.getRegularizationRequests({ status: filter === 'All' ? null : filter });
      setData(results);
    } catch (error) {
      console.error("Failed to load requests", error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReview = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectionError('');
    setIsReviewModalOpen(true);
  };

  const handleApprove = async () => {
    setIsActionLoading(true);
    try {
      await attendanceService.approveRegularization(selectedRequest.id);
      setIsReviewModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
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
      await attendanceService.rejectRegularization(selectedRequest.id, rejectionReason);
      setIsReviewModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Attendance Regularization"
          description="Review and manage employee attendance regularization requests."
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-end">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <Select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="w-40"
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="All">All Requests</option>
            </Select>
          </div>
        </div>
        
        <RegularizationTable 
          data={data}
          isLoading={isLoading}
          onReview={handleReview}
        />
      </div>

      <Modal 
        isOpen={isReviewModalOpen}
        onClose={() => !isActionLoading && setIsReviewModalOpen(false)}
        title="Review Regularization Request"
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
                  <span className="block text-xs text-gray-500">Date</span>
                  <span className="text-sm font-medium">
                    {new Date(selectedRequest.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Original Attendance</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Check In:</span>
                    <span className="font-medium text-gray-700">{formatTime(selectedRequest.originalCheckIn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Check Out:</span>
                    <span className="font-medium text-gray-700">{formatTime(selectedRequest.originalCheckOut)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Requested Changes</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Check In:</span>
                    <span className="font-medium text-blue-700">{formatTime(selectedRequest.requestedCheckIn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Check Out:</span>
                    <span className="font-medium text-blue-700">{formatTime(selectedRequest.requestedCheckOut)}</span>
                  </div>
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
              <div className="pt-4 border-t border-gray-200 flex justify-end">
                <Button variant="outline" onClick={() => setIsReviewModalOpen(false)}>
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
