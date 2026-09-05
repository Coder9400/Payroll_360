import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Check } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { payrollService } from '../../services/payrollService';
import { salaryRuleService } from '../../services/salaryRuleService';
import { cn } from '../../utils/cn';

export function PayrunCreate() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1 data
  const [structures, setStructures] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    periodStart: '',
    periodEnd: '',
    structureId: ''
  });

  // Step 2 data
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());

  useEffect(() => {
    const fetchStructures = async () => {
      try {
        const data = await salaryRuleService.getStructures();
        setStructures(data.filter(s => s.status === 'Active'));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStructures();
  }, []);

  const handleNextStep = async (e) => {
    e.preventDefault();
    if (new Date(formData.periodStart) > new Date(formData.periodEnd)) {
      setError("Start date cannot be after end date.");
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const employees = await payrollService.getEligibleEmployees(
        formData.periodStart, 
        formData.periodEnd, 
        formData.structureId
      );
      setEligibleEmployees(employees);
      setSelectedEmployees(new Set(employees.map(e => e.employeeId)));
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployee = (empId) => {
    const newSet = new Set(selectedEmployees);
    if (newSet.has(empId)) newSet.delete(empId);
    else newSet.add(empId);
    setSelectedEmployees(newSet);
  };

  const toggleAll = () => {
    if (selectedEmployees.size === eligibleEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(eligibleEmployees.map(e => e.employeeId)));
    }
  };

  const handleCreate = async () => {
    if (selectedEmployees.size === 0) {
      setError("Please select at least one employee.");
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const employeesToProcess = eligibleEmployees.filter(e => selectedEmployees.has(e.employeeId));
      
      const newPayrun = await payrollService.createPayrun({
        ...formData,
        employees: employeesToProcess
      });
      
      navigate(`/payroll/payruns/${newPayrun.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex items-center space-x-4">
        <Link to="/payroll/payruns" className="p-2 -ml-2 text-gray-400 hover:text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <PageHeader
          title="Create Payrun"
          subtitle={step === 1 ? "Step 1: Configuration" : "Step 2: Employee Selection"}
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Progress Steps */}
      <nav aria-label="Progress">
        <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
          <li className="md:flex-1">
            <div className={cn("group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4", step === 1 ? "border-primary-600" : "border-gray-200")}>
              <span className={cn("text-sm font-medium", step === 1 ? "text-primary-600" : "text-gray-500")}>Step 1</span>
              <span className="text-sm font-medium">Configuration</span>
            </div>
          </li>
          <li className="md:flex-1">
            <div className={cn("group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4", step === 2 ? "border-primary-600" : "border-gray-200")}>
              <span className={cn("text-sm font-medium", step === 2 ? "text-primary-600" : "text-gray-500")}>Step 2</span>
              <span className="text-sm font-medium">Employee Selection</span>
            </div>
          </li>
        </ol>
      </nav>

      {step === 1 && (
        <form onSubmit={handleNextStep} className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Payrun Name (Optional)</label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="e.g. Jan 2025 Payroll"
              />
            </div>
            
            <div>
              <label htmlFor="periodStart" className="block text-sm font-medium text-gray-700">Period Start <span className="text-red-500">*</span></label>
              <input
                type="date"
                name="periodStart"
                id="periodStart"
                required
                value={formData.periodStart}
                onChange={e => setFormData({...formData, periodStart: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="periodEnd" className="block text-sm font-medium text-gray-700">Period End <span className="text-red-500">*</span></label>
              <input
                type="date"
                name="periodEnd"
                id="periodEnd"
                required
                value={formData.periodEnd}
                onChange={e => setFormData({...formData, periodEnd: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="structureId" className="block text-sm font-medium text-gray-700">Salary Structure <span className="text-red-500">*</span></label>
              <select
                id="structureId"
                name="structureId"
                required
                value={formData.structureId}
                onChange={e => setFormData({...formData, structureId: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">-- Choose structure --</option>
                {structures.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-5 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Select Eligible Employees</h3>
            <p className="mt-1 text-sm text-gray-500">
              Found {eligibleEmployees.length} employees with active contracts between {formData.periodStart} and {formData.periodEnd}.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      checked={eligibleEmployees.length > 0 && selectedEmployees.size === eligibleEmployees.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Contract</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary Base</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {eligibleEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500">
                      No eligible employees found for this period. Try adjusting dates or ensuring contracts are active.
                    </td>
                  </tr>
                ) : (
                  eligibleEmployees.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          checked={selectedEmployees.has(emp.employeeId)}
                          onChange={() => toggleEmployee(emp.employeeId)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{emp.employeeName}</div>
                        <div className="text-sm text-gray-500">{emp.employeeId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {emp.department || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{emp.contractId}</div>
                        <div className="text-xs text-gray-500">{emp.jobPosition}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₹{emp.salary.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-5 sm:px-6 border-t border-gray-200 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting || selectedEmployees.size === 0}
              className="inline-flex justify-center items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>}
              Create Payrun
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
