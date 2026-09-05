/**
 * Salary Structures Page
 * ──────────────────────
 * Payroll Manager / Admin only.
 * Lists all salary structures with rule counts and management actions.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { payrollService } from '../services/payrollService';
import { Plus, Edit2, Trash2, BookOpen, CheckCircle, XCircle } from 'lucide-react';

const CATEGORY_OPTIONS = ['BASIC','ALLOWANCE','GROSS','DEDUCTION','CONTRIBUTION','NET'];
const COMPUTATION_TYPES = ['FIXED','PERCENTAGE','FORMULA'];

// ── Salary Rule Form ──────────────────────────────────────────────────────────
function RuleForm({ rule, onSave, onCancel, structureId }) {
  const [form, setForm] = React.useState(rule || {
    name: '', code: '', category: 'ALLOWANCE', sequence: 10,
    computation_type: 'FIXED', fixed_amount: '', percentage_base: '',
    percentage_value: '', formula: '', is_active: true,
  });
  const [saving, setSaving] = React.useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        salary_structure_id: structureId,
        sequence: parseInt(form.sequence) || 10,
        fixed_amount: form.computation_type === 'FIXED' ? parseFloat(form.fixed_amount) || 0 : null,
        percentage_value: form.computation_type === 'PERCENTAGE' ? parseFloat(form.percentage_value) || 0 : null,
        percentage_base: form.computation_type === 'PERCENTAGE' ? form.percentage_base : null,
        formula: form.computation_type === 'FORMULA' ? form.formula : null,
      };
      if (rule?.id) {
        await payrollService.updateSalaryRule(rule.id, payload);
      } else {
        await payrollService.createSalaryRule(payload);
      }
      onSave();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message);
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm uppercase" value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sequence</label>
          <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.sequence} onChange={e => set('sequence', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Computation Type *</label>
        <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.computation_type} onChange={e => set('computation_type', e.target.value)}>
          {COMPUTATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {form.computation_type === 'FIXED' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fixed Amount</label>
          <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.fixed_amount} onChange={e => set('fixed_amount', e.target.value)} />
        </div>
      )}
      {form.computation_type === 'PERCENTAGE' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Base (rule code or variable)</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm uppercase" value={form.percentage_base} onChange={e => set('percentage_base', e.target.value.toUpperCase())} placeholder="e.g. BASIC" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Percentage %</label>
            <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.percentage_value} onChange={e => set('percentage_value', e.target.value)} />
          </div>
        </div>
      )}
      {form.computation_type === 'FORMULA' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Formula Expression</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.formula} onChange={e => set('formula', e.target.value)} placeholder="e.g. BASIC + HRA + TRANSPORT" />
          <p className="text-xs text-gray-400 mt-1">Use rule codes (BASIC, HRA…) or context vars (contract_wage, worked_days…)</p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="rule_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
        <label htmlFor="rule_active" className="text-sm text-gray-700">Active</label>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" isLoading={saving}>Save Rule</Button>
      </div>
    </form>
  );
}

// ── Structure Form ────────────────────────────────────────────────────────────
function StructureForm({ structure, onSave, onCancel }) {
  const [form, setForm] = React.useState({ name: structure?.name || '', code: structure?.code || '', description: structure?.description || '', is_active: structure?.is_active ?? true });
  const [saving, setSaving] = React.useState(false);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (structure?.id) {
        await payrollService.updateSalaryStructure(structure.id, form);
      } else {
        await payrollService.createSalaryStructure(form);
      }
      onSave();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message);
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Structure Name *</label>
        <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
        <input className="w-full border rounded-lg px-3 py-2 text-sm uppercase" value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} disabled={!!structure?.id} required />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
        <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="struct_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
        <label htmlFor="struct_active" className="text-sm text-gray-700">Active</label>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" isLoading={saving}>{structure?.id ? 'Update' : 'Create'} Structure</Button>
      </div>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function SalaryStructures() {
  const navigate = useNavigate();
  const [structures, setStructures] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState(null);
  const [showStructForm, setShowStructForm] = React.useState(false);
  const [editStructure, setEditStructure] = React.useState(null);
  const [showRuleForm, setShowRuleForm] = React.useState(false);
  const [editRule, setEditRule] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await payrollService.getSalaryStructures();
      setStructures(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadDetail = React.useCallback(async (id) => {
    try {
      const data = await payrollService.getSalaryStructure(id);
      setSelected(data);
    } catch (e) { console.error(e); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Delete this salary rule?')) return;
    try { await payrollService.deleteSalaryRule(ruleId); await loadDetail(selected.id); }
    catch (err) { alert(err.response?.data?.error?.message || err.message); }
  };

  const CATEGORY_COLORS = {
    BASIC: 'bg-blue-100 text-blue-800',
    ALLOWANCE: 'bg-green-100 text-green-800',
    GROSS: 'bg-purple-100 text-purple-800',
    DEDUCTION: 'bg-red-100 text-red-800',
    CONTRIBUTION: 'bg-orange-100 text-orange-800',
    NET: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Salary Structures" description="Define salary structures and computation rules." />
        <Button onClick={() => { setEditStructure(null); setShowStructForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Structure
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Structure list */}
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
          ) : structures.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">No salary structures yet.</div>
          ) : structures.map(s => (
            <div
              key={s.id}
              onClick={() => loadDetail(s.id)}
              className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selected?.id === s.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{s.code}</p>
                </div>
                <div className="flex items-center gap-1">
                  {s.is_active ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-400" />}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span><BookOpen className="h-3 w-3 inline mr-1" />{s.active_rule_count ?? s.rule_count ?? 0} rules</span>
              </div>
            </div>
          ))}
        </div>

        {/* Rule detail panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{selected.name}</h3>
                  <p className="text-xs text-gray-400 font-mono">{selected.code}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditStructure(selected); setShowStructForm(true); }}>
                    <Edit2 className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <Button size="sm" onClick={() => { setEditRule(null); setShowRuleForm(true); }}>
                    <Plus className="h-3 w-3 mr-1" />Add Rule
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Seq</th>
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Value</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(selected.salary_rules || []).map(rule => (
                      <tr key={rule.id} className={!rule.is_active ? 'opacity-40' : ''}>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{rule.sequence}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-xs text-gray-700">{rule.code}</td>
                        <td className="px-4 py-3 text-gray-900">{rule.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[rule.category] || 'bg-gray-100 text-gray-700'}`}>
                            {rule.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{rule.computation_type}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600 max-w-[160px] truncate">
                          {rule.computation_type === 'FIXED' && `${rule.fixed_amount}`}
                          {rule.computation_type === 'PERCENTAGE' && `${rule.percentage_value}% of ${rule.percentage_base}`}
                          {rule.computation_type === 'FORMULA' && rule.formula}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditRule(rule); setShowRuleForm(true); }} className="p-1 hover:text-blue-600 text-gray-400 transition-colors">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDeleteRule(rule.id)} className="p-1 hover:text-red-600 text-gray-400 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!selected.salary_rules || selected.salary_rules.length === 0) && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No rules yet. Click "Add Rule" to get started.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a salary structure to view and manage its rules.</p>
            </div>
          )}
        </div>
      </div>

      {/* Structure form modal */}
      <Modal isOpen={showStructForm} onClose={() => setShowStructForm(false)} title={editStructure ? 'Edit Salary Structure' : 'New Salary Structure'}>
        <StructureForm structure={editStructure} onCancel={() => setShowStructForm(false)} onSave={async () => { setShowStructForm(false); await load(); if (selected) await loadDetail(selected.id); }} />
      </Modal>

      {/* Rule form modal */}
      <Modal isOpen={showRuleForm} onClose={() => setShowRuleForm(false)} title={editRule ? 'Edit Salary Rule' : 'Add Salary Rule'}>
        {selected && (
          <RuleForm rule={editRule} structureId={selected.id} onCancel={() => setShowRuleForm(false)} onSave={async () => { setShowRuleForm(false); await loadDetail(selected.id); await load(); }} />
        )}
      </Modal>
    </div>
  );
}
