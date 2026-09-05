import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { salaryRuleService } from '../../services/salaryRuleService';

export function RuleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'Basic',
    sequence: '',
    active: true,
    condition: 'Always True',
    calculationType: 'Fixed Amount',
    fixedAmount: '',
    percentage: '',
    basedOn: '',
    formula: ''
  });

  useEffect(() => {
    if (isEditing) {
      salaryRuleService.getRule(id)
        .then(data => setFormData(data))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    try {
      const dataToSave = {
        ...formData,
        sequence: parseInt(formData.sequence, 10),
        fixedAmount: formData.calculationType === 'Fixed Amount' ? parseFloat(formData.fixedAmount) || 0 : 0,
        percentage: formData.calculationType === 'Percentage' ? parseFloat(formData.percentage) || 0 : 0,
      };

      if (isEditing) {
        await salaryRuleService.updateRule(id, dataToSave);
      } else {
        await salaryRuleService.createRule(dataToSave);
      }
      navigate('/payroll/rules');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/payroll/rules" className="p-2 -ml-2 text-gray-400 hover:text-gray-500">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <PageHeader
            title={isEditing ? 'Edit Salary Rule' : 'New Salary Rule'}
            subtitle="Configure rule properties and calculation logic"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-6">
        
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4 border-b pb-2">Basic Information</h3>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Rule Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">Code <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="code"
                id="code"
                required
                value={formData.code}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm uppercase"
                placeholder="e.g. BASIC, HRA"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="Basic">Basic</option>
                <option value="Allowance">Allowance</option>
                <option value="Deduction">Deduction</option>
                <option value="Gross">Gross</option>
                <option value="Net">Net</option>
              </select>
            </div>

            <div>
              <label htmlFor="sequence" className="block text-sm font-medium text-gray-700">Sequence <span className="text-red-500">*</span></label>
              <input
                type="number"
                name="sequence"
                id="sequence"
                required
                value={formData.sequence}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="e.g. 10, 20, 30"
              />
              <p className="mt-1 text-xs text-gray-500">Rules are calculated in ascending sequence order.</p>
            </div>

            <div className="flex items-center h-full pt-6">
              <input
                id="active"
                name="active"
                type="checkbox"
                checked={formData.active}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>
          </div>
        </div>

        {/* Condition & Calculation */}
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4 border-b pb-2">Conditions & Calculation</h3>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            
            <div className="sm:col-span-2">
              <label htmlFor="condition" className="block text-sm font-medium text-gray-700">Condition</label>
              <input
                type="text"
                name="condition"
                id="condition"
                value={formData.condition}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="e.g. Always True, or expression like 'GROSS > 15000'"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="calculationType" className="block text-sm font-medium text-gray-700">Calculation Type</label>
              <select
                id="calculationType"
                name="calculationType"
                value={formData.calculationType}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="Fixed Amount">Fixed Amount</option>
                <option value="Percentage">Percentage</option>
                <option value="Formula">Formula</option>
              </select>
            </div>

            {formData.calculationType === 'Fixed Amount' && (
              <div>
                <label htmlFor="fixedAmount" className="block text-sm font-medium text-gray-700">Amount <span className="text-red-500">*</span></label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    name="fixedAmount"
                    id="fixedAmount"
                    required
                    value={formData.fixedAmount}
                    onChange={handleChange}
                    className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            {formData.calculationType === 'Percentage' && (
              <>
                <div>
                  <label htmlFor="percentage" className="block text-sm font-medium text-gray-700">Percentage (%) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="percentage"
                    id="percentage"
                    required
                    step="0.01"
                    value={formData.percentage}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="basedOn" className="block text-sm font-medium text-gray-700">Based On (Rule Code) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="basedOn"
                    id="basedOn"
                    required
                    value={formData.basedOn}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="e.g. BASIC"
                  />
                </div>
              </>
            )}

            {formData.calculationType === 'Formula' && (
              <div className="sm:col-span-2">
                <label htmlFor="formula" className="block text-sm font-medium text-gray-700">Formula / Expression <span className="text-red-500">*</span></label>
                <textarea
                  name="formula"
                  id="formula"
                  rows={3}
                  required
                  value={formData.formula}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm font-mono text-sm"
                  placeholder="e.g. BASIC + HRA + TA"
                />
                <p className="mt-2 text-xs text-gray-500">
                  You can use rule codes (BASIC, HRA) and 'contract.salary' in the formula.
                </p>
              </div>
            )}

          </div>
        </div>

        <div className="pt-5 border-t border-gray-200 flex justify-end gap-3">
          <Link
            to="/payroll/rules"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {submitting && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>}
            <Save className="-ml-1 mr-2 h-5 w-5" />
            {isEditing ? 'Update Rule' : 'Save Rule'}
          </button>
        </div>
      </form>
    </div>
  );
}
