import * as React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { contractService } from '../services/contractService';
import { scheduleService } from '../services/scheduleService';
import { employeeService } from '../services/employeeService';
import { ContractStatusBadge } from '../components/contracts/ContractStatusBadge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Save, ArrowLeft } from 'lucide-react';

export function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialEmployeeId = queryParams.get('employeeId');

  const isNew = id === 'new';

  const [isLoading, setIsLoading] = React.useState(!isNew);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [employees, setEmployees] = React.useState([]);
  const [schedules, setSchedules] = React.useState([]);
  const [apiError, setApiError] = React.useState('');

  const [formData, setFormData] = React.useState({
    employeeId: initialEmployeeId || '',
    status: 'Draft',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    jobPosition: '',
    department: '',
    wageType: 'Monthly',
    salary: '',
    scheduleId: '',
    notes: ''
  });
  
  const [errors, setErrors] = React.useState({});

  React.useEffect(() => {
    async function loadData() {
      try {
        const [empData, schedData] = await Promise.all([
          employeeService.getEmployees({ limit: 1000 }),
          scheduleService.getSchedules()
        ]);
        setEmployees(empData.data.filter(e => e.status !== 'Terminated'));
        setSchedules(schedData.filter(s => s.isActive));

        if (!isNew) {
          const contract = await contractService.getContract(id);
          setFormData({
            employeeId: contract.employeeId,
            status: contract.status,
            startDate: contract.startDate,
            endDate: contract.endDate || '',
            jobPosition: contract.jobPosition,
            department: contract.department,
            wageType: contract.wageType,
            salary: contract.salary,
            scheduleId: contract.scheduleId,
            notes: contract.notes || ''
          });
        }
      } catch (error) {
        console.error("Failed to load data", error);
        setApiError("Failed to load contract details.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id, isNew]);

  const validate = () => {
    const newErrors = {};
    if (!formData.employeeId) newErrors.employeeId = "Employee is required";
    if (!formData.startDate) newErrors.startDate = "Start date is required";
    if (formData.endDate && formData.endDate < formData.startDate) {
      newErrors.endDate = "End date cannot be before start date";
    }
    if (!formData.jobPosition.trim()) newErrors.jobPosition = "Job position is required";
    if (!formData.department.trim()) newErrors.department = "Department is required";
    if (!formData.salary || isNaN(formData.salary) || Number(formData.salary) <= 0) {
      newErrors.salary = "Valid positive salary amount is required";
    }
    if (!formData.scheduleId) newErrors.scheduleId = "Working schedule is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    setApiError('');

    try {
      const payload = {
        ...formData,
        salary: Number(formData.salary),
        endDate: formData.endDate || null
      };

      if (isNew) {
        await contractService.createContract(payload);
      } else {
        await contractService.updateContract(id, payload);
      }
      
      // If we came from the employee profile, go back there. Otherwise go to contracts list
      if (initialEmployeeId) {
        navigate(`/employees/${initialEmployeeId}`);
      } else {
        navigate('/contracts');
      }
    } catch (error) {
      console.error("Failed to save contract", error);
      setApiError(error.message || "An error occurred while saving the contract.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading contract details...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4 mb-2">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 flex items-center text-sm font-medium">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </button>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isNew ? 'New Contract' : `Contract: ${id}`}</h1>
          <p className="text-sm text-gray-500 mt-1">Configure employee compensation and working schedules.</p>
        </div>
        {!isNew && <ContractStatusBadge status={formData.status} />}
      </div>

      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md text-sm">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Contract Information</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className={errors.employeeId ? "border-red-500" : ""}
                disabled={!!initialEmployeeId && isNew}
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
                ))}
              </Select>
              {errors.employeeId && <p className="text-red-500 text-xs mt-1">{errors.employeeId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Position <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.jobPosition}
                onChange={(e) => setFormData({ ...formData, jobPosition: e.target.value })}
                placeholder="e.g. Frontend Developer"
                className={errors.jobPosition ? "border-red-500" : ""}
              />
              {errors.jobPosition && <p className="text-red-500 text-xs mt-1">{errors.jobPosition}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Engineering"
                className={errors.department ? "border-red-500" : ""}
              />
              {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
            </div>

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
                End Date (Optional)
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Draft">Draft</option>
                <option value="Running">Running</option>
                <option value="Expired">Expired</option>
                <option value="Cancelled">Cancelled</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Salary Information</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wage Type</label>
              <Select
                value={formData.wageType}
                onChange={(e) => setFormData({ ...formData, wageType: e.target.value })}
              >
                <option value="Monthly">Monthly</option>
                <option value="Hourly">Hourly</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salary Amount (₹) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                placeholder="e.g. 50000"
                className={errors.salary ? "border-red-500" : ""}
              />
              {errors.salary && <p className="text-red-500 text-xs mt-1">{errors.salary}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Working Schedule <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.scheduleId}
                onChange={(e) => setFormData({ ...formData, scheduleId: e.target.value })}
                className={errors.scheduleId ? "border-red-500" : ""}
              >
                <option value="">Select Working Schedule</option>
                {schedules.map(sched => (
                  <option key={sched.id} value={sched.id}>
                    {sched.name} ({sched.hoursPerWeek} hrs/week)
                  </option>
                ))}
              </Select>
              {errors.scheduleId && <p className="text-red-500 text-xs mt-1">{errors.scheduleId}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                className="w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2.5"
                rows="3"
                placeholder="Additional contract notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" type="button" onClick={() => navigate(-1)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isNew ? 'Create Contract' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
