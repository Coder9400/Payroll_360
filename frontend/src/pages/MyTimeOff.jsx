import * as React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { LeaveBalanceCard } from '../components/timeOff/LeaveBalanceCard';
import { LeaveRequestTable } from '../components/timeOff/LeaveRequestTable';
import { LeaveRequestForm } from '../components/timeOff/LeaveRequestForm';
import { timeOffService } from '../services/timeOffService';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { Plus } from 'lucide-react';

export function MyTimeOff() {
  const { currentUser } = useAuth();
  const employeeId = currentUser?.employee?.id ?? null;

  const [balances, setBalances] = React.useState([]);
  const [requests, setRequests] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!employeeId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [userBalances, userRequests] = await Promise.all([
        timeOffService.getEmployeeLeaveBalance(employeeId),
        timeOffService.getLeaveRequests({ employeeId })
      ]);

      // Pending amount isn't tracked on the allocation row itself — derive it by
      // summing this employee's own Pending requests per leave type.
      const pendingByType = userRequests
        .filter(r => r.status === 'Pending')
        .reduce((acc, r) => {
          acc[r.leaveTypeId] = (acc[r.leaveTypeId] ?? 0) + r.duration;
          return acc;
        }, {});

      setBalances(userBalances.map(b => ({ ...b, pending: pendingByType[b.leaveTypeId] ?? 0 })));
      setRequests(userRequests);
    } catch (error) {
      console.error("Failed to load time off data", error);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitRequest = async (formData) => {
    setIsSubmitting(true);
    try {
      await timeOffService.createLeaveRequest(formData);
      setIsFormOpen(false);
      await fetchData(); // Refresh balances and requests
    } catch (error) {
      console.error("Error creating request", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="My Time Off"
          description="View your leave balances and manage your time off requests."
        />
        <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Apply Leave
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Leave Balances</h3>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <LeaveBalanceCard isLoading={true} />
            <LeaveBalanceCard isLoading={true} />
          </div>
        ) : balances.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {balances.map(balance => (
              <LeaveBalanceCard 
                key={balance.id}
                title={balance.leaveTypeName}
                allocated={balance.allocated}
                used={balance.used}
                pending={balance.pending}
                remaining={balance.remaining}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-500">
            No active leave balances found for this year.
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">My Requests</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-1">
          <LeaveRequestTable 
            data={requests}
            isLoading={isLoading}
            hideEmployee={true}
          />
        </div>
      </div>

      <Modal 
        isOpen={isFormOpen}
        onClose={() => !isSubmitting && setIsFormOpen(false)}
        title="Apply for Leave"
      >
        <LeaveRequestForm 
          onSubmit={handleSubmitRequest}
          onCancel={() => setIsFormOpen(false)}
          isLoading={isSubmitting}
        />
      </Modal>
    </div>
  );
}
