import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { salaryRuleService } from '../../services/salaryRuleService';

export function StructureForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'Active',
    ruleIds: []
  });

  useEffect(() => {
    if (isEditing) {
      salaryRuleService.getStructure(id)
        .then(data => setFormData({
          name: data.name || '',
          code: data.code || '',
          description: data.description || '',
          status: data.status || 'Active',
          ruleIds: data.ruleIds || []
        }))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    try {
      if (isEditing) {
        await salaryRuleService.updateStructure(id, formData);
        navigate(`/payroll/structures/${id}`);
      } else {
        const newStruct = await salaryRuleService.createStructure(formData);
        navigate(`/payroll/structures/${newStruct.id}`);
      }
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
      <div className="flex items-center space-x-4">
        <Link to={isEditing ? `/payroll/structures/${id}` : "/payroll/structures"} className="p-2 -ml-2 text-gray-400 hover:text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <PageHeader
          title={isEditing ? 'Edit Salary Structure' : 'New Salary Structure'}
          subtitle="Define structure metadata (rules are added in the next step)"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Structure Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="name"
              id="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              placeholder="e.g. Standard Monthly"
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
              placeholder="e.g. STD_MONTHLY"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              id="description"
              rows={2}
              value={formData.description}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

        </div>

        <div className="pt-5 border-t border-gray-200 flex justify-end gap-3">
          <Link
            to={isEditing ? `/payroll/structures/${id}` : "/payroll/structures"}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>}
            <Save className="-ml-1 mr-2 h-5 w-5" />
            {isEditing ? 'Update Structure' : 'Create & Add Rules'}
          </button>
        </div>
      </form>
    </div>
  );
}
