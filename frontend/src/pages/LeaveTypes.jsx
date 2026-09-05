import * as React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { LeaveTypeTable } from '../components/timeOff/LeaveTypeTable';
import { timeOffService } from '../services/timeOffService';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus } from 'lucide-react';

export function LeaveTypes() {
  const [types, setTypes] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [formData, setFormData] = React.useState({
    name: '',
    code: '',
    isPaid: true,
    requiresAllocation: true,
    isActive: true
  });
  const [errors, setErrors] = React.useState({});

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await timeOffService.getLeaveTypes();
      setTypes(results);
    } catch (error) {
      console.error("Failed to load leave types", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.code.trim()) newErrors.code = "Code is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      await timeOffService.createLeaveType({
        ...formData,
        isPaid: formData.isPaid === true || formData.isPaid === 'true',
        requiresAllocation: formData.requiresAllocation === true || formData.requiresAllocation === 'true',
        isActive: formData.isActive === true || formData.isActive === 'true'
      });
      setIsModalOpen(false);
      setFormData({
        name: '',
        code: '',
        isPaid: true,
        requiresAllocation: true,
        isActive: true
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to create leave type", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Leave Types"
          description="Configure company leave policies and types."
        />
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Leave Type
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <LeaveTypeTable 
          data={types}
          isLoading={isLoading}
        />
      </div>

      <Modal 
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="Create Leave Type"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Bereavement Leave"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. BL"
                className={errors.code ? "border-red-500" : ""}
              />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pay Type</label>
              <Select
                value={formData.isPaid}
                onChange={(e) => setFormData({ ...formData, isPaid: e.target.value })}
              >
                <option value={true}>Paid</option>
                <option value={false}>Unpaid</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allocation Required</label>
              <Select
                value={formData.requiresAllocation}
                onChange={(e) => setFormData({ ...formData, requiresAllocation: e.target.value })}
              >
                <option value={true}>Yes</option>
                <option value={false}>No</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <Select
              value={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.value })}
            >
              <option value={true}>Active</option>
              <option value={false}>Inactive</option>
            </Select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Type
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
