import * as React from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { timeOffService } from "../../services/timeOffService";

export function LeaveRequestForm({ onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = React.useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: ""
  });
  
  const [errors, setErrors] = React.useState({});
  const [leaveTypes, setLeaveTypes] = React.useState([]);
  const [balances, setBalances] = React.useState([]);
  const [isDataLoading, setIsDataLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [types, currentBalances] = await Promise.all([
          timeOffService.getLeaveTypes(),
          // Assume EMP-001 is the current logged-in user for mock purposes
          timeOffService.getEmployeeLeaveBalance('EMP-001')
        ]);
        setLeaveTypes(types.filter(t => t.isActive));
        setBalances(currentBalances);
      } catch (err) {
        console.error("Failed to load form data", err);
      } finally {
        setIsDataLoading(false);
      }
    }
    loadData();
  }, []);

  const selectedType = leaveTypes.find(t => t.id === formData.leaveTypeId);
  
  // Calculate mock duration
  let duration = 0;
  if (formData.startDate && formData.endDate) {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end >= start) {
      duration = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
    }
  }

  // Calculate balance impacts
  let allocation = null;
  let remainingAfter = 0;
  let hasInsufficientBalance = false;
  
  if (selectedType && selectedType.requiresAllocation) {
    const year = formData.startDate ? new Date(formData.startDate).getFullYear() : new Date().getFullYear();
    allocation = balances.find(b => b.leaveTypeId === selectedType.id && b.year === year);
    if (allocation) {
      remainingAfter = allocation.remaining - duration;
      hasInsufficientBalance = remainingAfter < 0;
    } else {
      hasInsufficientBalance = true; // Required allocation but none exists
    }
  }

  const validate = () => {
    const newErrors = {};
    if (!formData.leaveTypeId) newErrors.leaveTypeId = "Leave Type is required";
    if (!formData.startDate) newErrors.startDate = "Start Date is required";
    if (!formData.endDate) newErrors.endDate = "End Date is required";
    if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = "End date cannot be before start date";
    }
    if (!formData.reason.trim()) newErrors.reason = "Reason is required";
    if (hasInsufficientBalance) {
      newErrors.balance = "Insufficient leave balance.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...formData,
      employeeId: 'EMP-001' // Mock ID
    });
  };

  if (isDataLoading) {
    return <div className="p-4 text-center text-sm text-gray-500">Loading form...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Leave Type <span className="text-red-500">*</span>
        </label>
        <Select
          value={formData.leaveTypeId}
          onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
          className={errors.leaveTypeId ? "border-red-500" : ""}
        >
          <option value="">Select a leave type</option>
          {leaveTypes.map(lt => (
            <option key={lt.id} value={lt.id}>{lt.name}</option>
          ))}
        </Select>
        {errors.leaveTypeId && <p className="text-red-500 text-xs mt-1">{errors.leaveTypeId}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date <span className="text-red-500">*</span>
          </label>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className={errors.startDate ? "border-red-500" : ""}
          />
          {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date <span className="text-red-500">*</span>
          </label>
          <Input
            type="date"
            value={formData.endDate}
            min={formData.startDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className={errors.endDate ? "border-red-500" : ""}
          />
          {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
        </div>
      </div>

      {formData.startDate && formData.endDate && duration > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-gray-500">Requested Duration:</span>
            <span className="font-medium text-gray-900">{duration} {duration === 1 ? 'day' : 'days'}</span>
          </div>
          
          {selectedType && selectedType.requiresAllocation && (
            <>
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-500">Available Balance:</span>
                <span className="font-medium text-gray-900">{allocation ? allocation.remaining : 0} days</span>
              </div>
              <div className={`flex justify-between items-center text-sm font-medium pt-2 border-t border-gray-200 ${hasInsufficientBalance ? 'text-red-600' : 'text-gray-900'}`}>
                <span>Remaining After:</span>
                <span>{allocation ? remainingAfter : 0} days</span>
              </div>
            </>
          )}
          {errors.balance && (
            <p className="text-red-600 text-xs mt-3 bg-red-50 p-2 rounded border border-red-100">
              {errors.balance}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          className={`w-full rounded-md border shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2.5 ${
            errors.reason ? "border-red-500" : "border-gray-300"
          }`}
          rows="3"
          placeholder="Please provide a reason for your leave request..."
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
        />
        {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason}</p>}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading} disabled={isLoading || hasInsufficientBalance}>
          Submit Request
        </Button>
      </div>
    </form>
  );
}
