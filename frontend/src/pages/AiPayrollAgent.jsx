import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { agentService } from '../services/agentService';
import { employeeService } from '../services/employeeService';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Bot, X, ChevronRight, CheckCircle2, AlertCircle, Clock,
  User, Banknote, CalendarDays, TrendingDown, ShieldCheck,
  ThumbsUp, ThumbsDown, Loader2, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';

const TOOL_META = {
  check_duplicate:      { label: 'Checking for duplicates',              icon: ShieldCheck },
  fetch_employee:       { label: 'Fetching employee & contract',          icon: User },
  fetch_salary_rules:   { label: 'Loading salary structure',             icon: Banknote },
  fetch_attendance:     { label: 'Analysing attendance records',          icon: CalendarDays },
  fetch_paid_leaves:    { label: 'Checking approved leaves',             icon: CalendarDays },
  fetch_unpaid_absences:{ label: 'Computing unauthorized absences',       icon: TrendingDown },
  validate_policy:      { label: 'Validating against company policy',    icon: ShieldCheck },
};

function fmt(v) {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

function StepCard({ step }) {
  const [expanded, setExpanded] = React.useState(false);
  const meta = TOOL_META[step.tool] || { label: step.tool, icon: Bot };
  const Icon = meta.icon;

  const statusIcon = step.status === 'done'
    ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
    : step.status === 'running'
    ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
    : <Clock className="w-5 h-5 text-gray-300 flex-shrink-0" />;

  const bgClass = step.status === 'done' ? 'bg-emerald-50 border-emerald-200' :
                  step.status === 'running' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200';

  return (
    <div className={`rounded-lg border p-4 transition-all ${bgClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {statusIcon}
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-gray-500" />
            <span className="text-base font-medium text-gray-800">{step.label || meta.label}</span>
          </div>
        </div>
        {step.status === 'done' && step.llmThought && (
          <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        )}
      </div>
      {expanded && step.llmThought && (
        <div className="mt-3 ml-10 pl-4 border-l-2 border-blue-200">
          <p className="text-sm text-blue-700 italic">{step.llmThought}</p>
        </div>
      )}
    </div>
  );
}

function ProposalView({ result, onApprove, onReject, isApproving }) {
  const { employee, period, attendance, leaves, absences, summary, policyValidation, auditSummary, payslipLines } = result;

  const earningLines = (payslipLines || []).filter(l => ['BASIC','ALLOWANCE','OVERTIME'].includes(l.category));
  const deductionLines = (payslipLines || []).filter(l => ['DEDUCTION','TAX'].includes(l.category));

  return (
    <div className="space-y-6">
      {/* Employee header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {employee.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-xl">{employee.name}</p>
            <p className="text-indigo-200">{employee.code} · {employee.jobTitle} · {employee.department}</p>
            <p className="text-indigo-200 text-sm mt-1">{period.start} → {period.end}</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Days Present', value: attendance.daysPresent, sub: `of ${attendance.workingDays} working days` },
          { label: 'Leave Taken', value: leaves.paidLeaveDays, sub: 'approved paid days' },
          { label: 'Unauthorized', value: absences.unauthorizedDays, sub: 'deduction applied', warn: absences.unauthorizedDays > 0 },
        ].map(s => (
          <div key={s.label} className={`rounded-lg p-4 border text-center ${s.warn ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-3xl font-bold ${s.warn ? 'text-red-600' : 'text-gray-900'}`}>{s.value}</p>
            <p className="text-sm font-medium text-gray-600 mt-1">{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Earnings & Deductions */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-5">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Earnings</h4>
          <div className="space-y-3">
            {earningLines.map(l => (
              <div key={l.code} className="flex justify-between">
                <span className="text-gray-600">{l.name}</span>
                <span className="font-medium text-gray-900">{fmt(l.amount)}</span>
              </div>
            ))}
            {absences.unauthorizedDays > 0 && (
              <div className="flex justify-between">
                <span className="text-red-500">Absence Deduction</span>
                <span className="font-medium text-red-600">-{fmt(absences.deductionAmount)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Deductions</h4>
          <div className="space-y-3">
            {deductionLines.map(l => (
              <div key={l.code} className="flex justify-between">
                <span className="text-gray-600">{l.name}</span>
                <span className="font-medium text-red-600">-{fmt(Math.abs(l.amount))}</span>
              </div>
            ))}
            {deductionLines.length === 0 && <p className="text-sm text-gray-400">No deductions</p>}
          </div>
        </div>
      </div>

      {/* Net pay */}
      <div className="bg-gray-900 rounded-xl p-6 flex justify-between items-center">
        <span className="text-gray-300 font-medium text-lg">Net Pay</span>
        <span className="text-4xl font-bold text-emerald-400">{fmt(summary.netAmount)}</span>
      </div>

      {/* Policy validation */}
      {(policyValidation.errors?.length > 0 || policyValidation.warnings?.length > 0) && (
        <div className="space-y-2">
          {policyValidation.errors?.map((e, i) => (
            <div key={i} className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />{e}
            </div>
          ))}
          {policyValidation.warnings?.map((w, i) => (
            <div key={i} className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />{w}
            </div>
          ))}
        </div>
      )}

      {/* AI Audit summary */}
      {auditSummary && (
        <div className="p-5 bg-indigo-50 border border-indigo-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">AI Audit Summary</span>
          </div>
          <p className="text-indigo-800 leading-relaxed">{auditSummary}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-lg py-3"
          onClick={onApprove}
          disabled={policyValidation.errors?.length > 0 || isApproving}
          isLoading={isApproving}
        >
          <ThumbsUp className="w-5 h-5 mr-2" /> Approve & Create Payslip
        </Button>
        <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 text-lg px-8 py-3" onClick={onReject}>
          <ThumbsDown className="w-5 h-5 mr-2" /> Reject
        </Button>
      </div>
    </div>
  );
}

function EmployeeSearchSelect({ employees, value, onChange }) {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef(null);

  React.useEffect(() => {
    if (value) {
      const emp = employees.find(e => e.id === value);
      if (emp) setQuery(`${emp.employeeId} · ${emp.firstName} ${emp.lastName}`);
    } else {
      setQuery('');
    }
  }, [value, employees]);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query === '' 
    ? employees 
    : employees.filter(e => 
        `${e.employeeId} ${e.firstName} ${e.lastName}`.toLowerCase().includes(query.toLowerCase())
      );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Type to search employee..."
        value={query}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onChange(''); // Reset value on edit
        }}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.map(emp => (
            <li
              key={emp.id}
              className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b last:border-0 border-gray-100"
              onClick={() => {
                onChange(emp.id);
                setQuery(`${emp.employeeId} · ${emp.firstName} ${emp.lastName}`);
                setOpen(false);
              }}
            >
              <div className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</div>
              <div className="text-xs text-gray-500">{emp.employeeId} · {emp.department}</div>
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
          No employees found
        </div>
      )}
    </div>
  );
}

export function AiPayrollAgent() {
  const navigate = useNavigate();
  const STEP_FORM = 'form';
  const STEP_RUNNING = 'running';
  const STEP_RESULT = 'result';
  const STEP_DONE = 'done';

  const [step, setStep] = React.useState(STEP_FORM);
  const [employees, setEmployees] = React.useState([]);
  const [form, setForm] = React.useState({ employeeId: '', month: '' });
  const [jobId, setJobId] = React.useState(null);
  const [jobData, setJobData] = React.useState(null);
  const [isApproving, setIsApproving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const pollRef = React.useRef(null);

  React.useEffect(() => {
    employeeService.getEmployees({ limit: 500 }).then(res => {
      const list = res?.data || res?.list || res?.employees || (Array.isArray(res) ? res : []);
      setEmployees(list);
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!jobId || step !== STEP_RUNNING) return;

    pollRef.current = setInterval(async () => {
      try {
        const data = await agentService.getStatus(jobId);
        setJobData(data);

        if (data.status === 'completed') {
          clearInterval(pollRef.current);
          setStep(STEP_RESULT);
        } else if (data.status === 'error') {
          clearInterval(pollRef.current);
          setError(data.error || 'Agent encountered an error.');
          setStep(STEP_FORM);
        }
      } catch (err) {
        clearInterval(pollRef.current);
        setError('Failed to poll agent status.');
        setStep(STEP_FORM);
      }
    }, 2000);

    return () => clearInterval(pollRef.current);
  }, [jobId, step]);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.month) return;

    const [year, month] = form.month.split('-');
    const periodStart = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const periodEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    setError(null);
    setStep(STEP_RUNNING);

    try {
      const { jobId: id } = await agentService.runPayroll({
        employeeId: form.employeeId,
        periodStart,
        periodEnd,
      });
      setJobId(id);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to start agent.');
      setStep(STEP_FORM);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await agentService.approve(jobId);
      setStep(STEP_DONE);
      setTimeout(() => {
        if (result?.payrunId) navigate(`/payruns/${result.payrunId}`);
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Approval failed. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      await agentService.reject(jobId, 'Rejected by HR');
    } catch (_) {}
    setStep(STEP_FORM);
    setJobId(null);
    setJobData(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Payroll Agent"
        description="Automatically collect, verify, and compute payroll using AI."
      />

      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-4xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}

        {/* STEP: Form */}
        {step === STEP_FORM && (
          <form onSubmit={handleStart} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block font-medium text-gray-700 mb-2">Select Employee</label>
                <EmployeeSearchSelect
                  employees={employees}
                  value={form.employeeId}
                  onChange={(id) => setForm(f => ({ ...f, employeeId: id }))}
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Payroll Month</label>
                <input
                  type="month"
                  required
                  value={form.month}
                  onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
              <p className="text-sm text-indigo-800 font-medium mb-3 flex items-center gap-2">
                <Bot className="w-5 h-5" /> The AI agent will autonomously perform:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(TOOL_META).map(m => (
                  <div key={m.label} className="flex items-center gap-2 text-sm text-indigo-700">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" /> {m.label}
                  </div>
                ))}
              </div>
            </div>
            
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-lg">
              <Sparkles className="w-5 h-5 mr-2" /> Launch AI Agent
            </Button>
          </form>
        )}

        {/* STEP: Running */}
        {step === STEP_RUNNING && (
          <div className="space-y-4">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
              <h3 className="font-bold text-gray-900 text-xl">Agent Running…</h3>
              <p className="text-gray-500 mt-1">Fetching and analyzing data in real-time</p>
            </div>
            {jobData?.steps?.length > 0 ? (
              jobData.steps.map((s, i) => <StepCard key={i} step={s} />)
            ) : (
              <div className="text-center py-12">
                <Spinner size="lg" />
                <p className="text-gray-400 mt-4">Initializing environment…</p>
              </div>
            )}
          </div>
        )}

        {/* STEP: Result */}
        {step === STEP_RESULT && jobData?.result && (
          <ProposalView
            result={jobData.result}
            onApprove={handleApprove}
            onReject={handleReject}
            isApproving={isApproving}
          />
        )}

        {/* STEP: Done */}
        {step === STEP_DONE && (
          <div className="text-center py-16 space-y-5">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-2xl">Payroll Approved!</h3>
            <p className="text-gray-500">The payrun and payslip have been successfully created.</p>
            <p className="text-sm text-gray-400 mt-2">Redirecting to payrun details...</p>
          </div>
        )}
      </div>
    </div>
  );
}
