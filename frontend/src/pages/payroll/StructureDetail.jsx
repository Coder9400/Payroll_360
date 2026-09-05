import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Check, X, Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { salaryRuleService } from '../../services/salaryRuleService';
import { cn } from '../../utils/cn';

export function StructureDetail() {
  const { id } = useParams();
  
  const [structure, setStructure] = useState(null);
  const [allRules, setAllRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [structData, rulesData] = await Promise.all([
        salaryRuleService.getStructure(id),
        salaryRuleService.getRules()
      ]);
      setStructure(structData);
      setAllRules(rulesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAddRule = async () => {
    if (!selectedRuleId) return;
    
    // Check if already in structure
    if (structure.ruleIds.includes(selectedRuleId)) {
      alert("Rule is already in this structure.");
      return;
    }

    setSaving(true);
    try {
      const newRuleIds = [...structure.ruleIds, selectedRuleId];
      await salaryRuleService.updateStructure(id, { ruleIds: newRuleIds });
      await loadData();
      setShowAddModal(false);
      setSelectedRuleId('');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRule = async (ruleIdToRemove) => {
    if (!window.confirm("Are you sure you want to remove this rule from the structure?")) return;
    
    setSaving(true);
    try {
      const newRuleIds = structure.ruleIds.filter(rid => rid !== ruleIdToRemove);
      await salaryRuleService.updateStructure(id, { ruleIds: newRuleIds });
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!structure) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-sm font-medium text-gray-900">Structure not found</h3>
        <Link to="/payroll/structures" className="mt-4 text-primary-600 hover:text-primary-500">Back to Structures</Link>
      </div>
    );
  }

  const unassignedRules = allRules.filter(r => !structure.ruleIds.includes(r.id));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/payroll/structures" className="p-2 -ml-2 text-gray-400 hover:text-gray-500">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <PageHeader
            title={structure.name}
            subtitle={structure.code}
          />
        </div>
        <Link
          to={`/payroll/structures/${id}/edit`}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <Edit2 className="-ml-1 mr-2 h-4 w-4 text-gray-500" />
          Edit Properties
        </Link>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
          <div>
            <dt className="text-sm font-medium text-gray-500">Description</dt>
            <dd className="mt-1 text-sm text-gray-900">{structure.description || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <span className={cn(
                "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                structure.status === 'Active' ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
              )}>
                {structure.status}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* Salary Rules Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Assigned Salary Rules</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
          >
            <Plus className="-ml-1 mr-1 h-4 w-4" /> Add Rule
          </button>
        </div>
        
        {structure.rules && structure.rules.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seq</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rule</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calc Type</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {structure.rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{rule.sequence}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rule.name} <span className="text-gray-500 font-normal">({rule.code})</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rule.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rule.calculationType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemoveRule(rule.id)}
                        disabled={saving}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No rules assigned</h3>
            <p className="mt-1 text-sm text-gray-500">This structure won't calculate any payslip lines.</p>
          </div>
        )}
      </div>

      {/* Add Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Add Salary Rule</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {unassignedRules.length === 0 ? (
                <p className="text-sm text-gray-500 text-center">All available rules are already assigned to this structure.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="ruleSelect" className="block text-sm font-medium text-gray-700">Select Rule</label>
                    <select
                      id="ruleSelect"
                      value={selectedRuleId}
                      onChange={(e) => setSelectedRuleId(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    >
                      <option value="">-- Choose a rule --</option>
                      {unassignedRules.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.sequence} - {r.name} ({r.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRule}
                disabled={!selectedRuleId || saving}
                className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {saving && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>}
                Add Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
