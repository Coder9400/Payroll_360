import * as React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { AllocationTable } from '../components/timeOff/AllocationTable';
import { timeOffService } from '../services/timeOffService';
import { employeeService } from '../services/employeeService';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus } from 'lucide-react';

export function LeaveAllocations() {
  const [allocations, setAllocations] = React.useState([]);
  const [leaveTypes, setLeaveTypes] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const EMPTY_FORM = {
    employeeId: '',
    leaveTypeId: '',
    year: new Date().getFullYear(),
    allocated: '',
  };

  const [formData, setFormData] = React.useState(EMPTY_FORM);
  const [errors, setErrors] = React.useState({});
  const [employees, setEmployees] = React.useState([]);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [allocs, types, empRes] = await Promise.all([
        timeOffService.getLeaveAllocations({ limit: 200 }),
        timeOffService.getLeaveTypes(),
        employeeService.getEmployees({ limit: 500, status: 'ACTIVE' }),
      ]);
      setAllocations(allocs);
      setLeaveTypes(types.filter(t => t.requiresAllocation && t.isActive));
      setEmployees(empRes.data ?? []);
    } catch (error) {
      console.error('Failed to load allocations', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validate = () => {
    const newErrors = {};
    if (!formData.employeeId) newErrors.employeeId = 'Employee is required';
    if (!formData.leaveTypeId) newErrors.leaveTypeId = 'Leave Type is required';
    if (!formData.year || isNaN(formData.year)) newErrors.year = 'Valid year is required';
    if (!formData.allocated || isNaN(formData.allocated) || Number(formData.allocated) <= 0) {
      newErrors.allocated = 'Valid positive allocation amount is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await timeOffService.createLeaveAllocation({
        ...formData,
        year: Number(formData.year),
        allocated: Number(formData.allocated),
      });
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      await fetchData();
    } catch (error) {
      console.error('Failed to create allocation', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: `${e.firstName} ${e.lastName} (${e.employeeId})`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Leave Allocations"
          description="Manage employee leave quotas and balances."
        />
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Allocation
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <AllocationTable
          data={allocations}
          isLoading={isLoading}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="Create Leave Allocation"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Employee dropdown — replaces the old broken free-text inputs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              options={employeeOptions}
              placeholder="Select an employee"
              className={errors.employeeId ? 'border-red-500' : ''}
            />
            {errors.employeeId && <p className="text-red-500 text-xs mt-1">{errors.employeeId}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.leaveTypeId}
              onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
              className={errors.leaveTypeId ? 'border-red-500' : ''}
            >
              <option value="">Select a leave type</option>
              {leaveTypes.map(lt => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </Select>
            {errors.leaveTypeId && <p className="text-red-500 text-xs mt-1">{errors.leaveTypeId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className={errors.year ? 'border-red-500' : ''}
              />
              {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allocated Days <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.5"
                value={formData.allocated}
                onChange={(e) => setFormData({ ...formData, allocated: e.target.value })}
                className={errors.allocated ? 'border-red-500' : ''}
              />
              {errors.allocated && <p className="text-red-500 text-xs mt-1">{errors.allocated}</p>}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Allocation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

