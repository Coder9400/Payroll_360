import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { employeeService } from "../services/employeeService";
import { contractService } from "../services/contractService";
import { attendanceService } from "../services/attendanceService";
import { timeOffService } from "../services/timeOffService";
import { payrollService } from "../services/payrollService";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Tabs } from "../components/ui/Tabs";
import { EmployeeStatusBadge } from "../components/employee/EmployeeStatusBadge";
import { Spinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { EmployeeForm } from "../components/employee/EmployeeForm";
import { ContractTable } from "../components/contracts/ContractTable";
import { ProgressStats } from "../components/employee/ProgressStats";
import {
  ArrowLeft,
  Edit,
  PowerOff,
  Mail,
  Phone,
  Calendar,
  Building,
  Briefcase,
  User,
  FileText,
  Clock,
  CalendarDays,
  Wallet,
  Receipt,
} from "lucide-react";

const useToast = () => ({
  toast: ({ title, description }) => console.log('Toast:', title, description),
});

const TABS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'progress',   label: 'Progress' },
  { id: 'personal',   label: 'Personal' },
  { id: 'employment', label: 'Employment' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave',      label: 'Leave' },
  { id: 'contract',   label: 'Contract' },
  { id: 'salary',     label: 'Salary' },
  { id: 'payroll',    label: 'Payroll' },
];

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="text-sm text-gray-500 flex items-center"><Icon className="h-4 w-4 mr-2" /> {label}</p>
      <p className="text-sm font-medium text-gray-900 mt-1">
        {value || <span className="text-gray-400">Not provided</span>}
      </p>
    </div>
  );
}

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function money(n) {
  const num = Number(n ?? 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [employee, setEmployee] = React.useState(null);
  const [contracts, setContracts] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [refData, setRefData] = React.useState(null);

  // Tab-scoped data (lazy loaded)
  const [attendance, setAttendance] = React.useState({ data: [], metrics: null, loading: false, loaded: false });
  const [leave, setLeave] = React.useState({ allocations: [], requests: [], loading: false, loaded: false });
  const [payslips, setPayslips] = React.useState({ data: [], loading: false, loaded: false });
  const [salaryStructures, setSalaryStructures] = React.useState({ data: [], loading: false, loaded: false });

  const fetchEmployee = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, contractData] = await Promise.all([
        employeeService.getEmployee(id),
        contractService.getEmployeeContracts(id).catch(() => []),
      ]);
      setEmployee(data);
      setContracts(contractData ?? []);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load employee details.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => { fetchEmployee(); }, [fetchEmployee]);

  React.useEffect(() => {
    async function loadRefData() {
      try {
        const data = await employeeService.getReferenceData();
        setRefData(data);
      } catch (err) {
        console.error("Failed to load reference data", err);
      }
    }
    loadRefData();
  }, []);

  // Lazily load data for the active tab
  React.useEffect(() => {
    if (activeTab === 'attendance' && !attendance.loaded) {
      setAttendance((p) => ({ ...p, loading: true }));
      attendanceService.getEmployeeAttendance(id, { limit: 50 })
        .then((res) => setAttendance({ data: res.data, metrics: res.metrics, loading: false, loaded: true }))
        .catch(() => setAttendance({ data: [], metrics: null, loading: false, loaded: true }));
    }
    if (activeTab === 'leave' && !leave.loaded) {
      setLeave((p) => ({ ...p, loading: true }));
      Promise.all([
        timeOffService.getEmployeeLeaveBalance(id).catch(() => []),
        timeOffService.getLeaveRequests({ employeeId: id, limit: 50 }).catch(() => []),
      ]).then(([allocations, requests]) => setLeave({ allocations, requests, loading: false, loaded: true }));
    }
    if (activeTab === 'payroll' && !payslips.loaded) {
      setPayslips((p) => ({ ...p, loading: true }));
      payrollService.getPayslips({ employee_id: id, limit: 50 })
        .then((data) => setPayslips({ data: Array.isArray(data) ? data : [], loading: false, loaded: true }))
        .catch(() => setPayslips({ data: [], loading: false, loaded: true }));
    }
    if (activeTab === 'salary' && !salaryStructures.loaded) {
      setSalaryStructures((p) => ({ ...p, loading: true }));
      payrollService.getSalaryStructures()
        .then((data) => setSalaryStructures({ data: Array.isArray(data) ? data : [], loading: false, loaded: true }))
        .catch(() => setSalaryStructures({ data: [], loading: false, loaded: true }));
    }
  }, [activeTab, id, attendance.loaded, leave.loaded, payslips.loaded, salaryStructures.loaded]);

  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      await employeeService.updateEmployee(id, formData);
      toast({ title: "Employee updated successfully", type: "success" });
      setIsFormModalOpen(false);
      fetchEmployee();
    } catch (error) {
      toast({ title: "Error updating employee", description: error.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    setIsSubmitting(true);
    try {
      await employeeService.deactivateEmployee(id);
      toast({ title: "Employee deactivated", type: "success" });
      setIsDeactivateModalOpen(false);
      fetchEmployee();
    } catch (error) {
      toast({ title: "Error deactivating employee", description: error.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <Spinner size="xl" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="mt-8">
        <EmptyState
          title="Employee Not Found"
          description={error || "The employee you are looking for does not exist."}
        />
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={() => navigate("/employees")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  const latestContract = contracts?.[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" onClick={() => navigate("/employees")} className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary-600 to-primary-400"></div>
        <div className="px-6 sm:px-8 pb-6 flex flex-col sm:flex-row sm:items-end justify-between relative">
          <div className="flex flex-col sm:flex-row sm:items-end space-y-4 sm:space-y-0 sm:space-x-5 -mt-12 sm:-mt-10 relative z-10">
            <Avatar
              fallback={`${employee.firstName[0]}${employee.lastName[0]}`}
              className="h-24 w-24 text-2xl border-4 border-white shadow-md bg-white text-primary-600 font-bold"
            />
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-gray-900">{employee.firstName} {employee.lastName}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-600">
                <span className="font-medium text-gray-900">{employee.position}</span>
                <span className="text-gray-300">•</span>
                <span>{employee.department}</span>
                <span className="text-gray-300">•</span>
                <span>{employee.employeeId}</span>
                <span className="text-gray-300">•</span>
                <EmployeeStatusBadge status={employee.status} />
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-0 flex items-center space-x-3">
            <Button variant="outline" onClick={() => setIsFormModalOpen(true)}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button
              variant="danger"
              onClick={() => setIsDeactivateModalOpen(true)}
              disabled={employee.status === 'Inactive' || employee.status === 'Terminated'}
            >
              <PowerOff className="h-4 w-4 mr-2" /> Deactivate
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">Job Information</h2>
            <div className="space-y-4">
              <InfoRow icon={Building} label="Department" value={employee.department} />
              <InfoRow icon={Briefcase} label="Job Position" value={employee.position} />
              <InfoRow icon={User} label="Manager" value={employee.managerName} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">Contact</h2>
            <div className="space-y-4">
              <InfoRow icon={Mail} label="Email" value={employee.email} />
              <InfoRow icon={Phone} label="Phone" value={employee.phone} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">Current Contract</h2>
            {latestContract ? (
              <div className="space-y-4">
                <InfoRow icon={Wallet} label="Salary" value={money(latestContract.salary)} />
                <InfoRow icon={Calendar} label="Status" value={latestContract.status} />
              </div>
            ) : (
              <p className="text-sm text-gray-400">No contract on file.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'progress' && (
        <ProgressStats employeeId={id} />
      )}

      {activeTab === 'personal' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
            <InfoRow icon={User} label="Full Name" value={`${employee.firstName} ${employee.lastName}`} />
            <InfoRow icon={Mail} label="Email" value={employee.email} />
            <InfoRow icon={Phone} label="Phone" value={employee.phone} />
            <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(employee.dob)} />
            <InfoRow icon={Building} label="Address" value={employee.address} />
          </div>
        </div>
      )}

      {activeTab === 'employment' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">Employment Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
            <InfoRow icon={Building} label="Department" value={employee.department} />
            <InfoRow icon={Briefcase} label="Job Position" value={employee.position} />
            <InfoRow icon={User} label="Manager" value={employee.managerName} />
            <InfoRow icon={Briefcase} label="Employee Type" value={employee.employeeType} />
            <InfoRow icon={Calendar} label="Joining Date" value={formatDate(employee.joiningDate)} />
            <InfoRow icon={CalendarDays} label="Status" value={employee.status} />
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {attendance.loading && <div className="flex justify-center py-8"><Spinner /></div>}
          {!attendance.loading && attendance.data.length === 0 && (
            <EmptyState icon={Clock} title="No attendance records" description="Attendance history will appear here once recorded." />
          )}
          {!attendance.loading && attendance.data.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {attendance.data.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-gray-900 font-medium">{r.date}</span>
                  <span className="text-gray-500">
                    {r.checkIn ? new Date(r.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    {' → '}
                    {r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                  <span className="text-gray-500">{r.workedHours ?? '—'}h</span>
                  <Badge variant={r.status === 'Present' ? 'success' : r.status === 'Late' ? 'warning' : 'default'}>
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'leave' && (
        <div className="space-y-6">
          {leave.loading && <div className="flex justify-center py-8"><Spinner /></div>}
          {!leave.loading && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {leave.allocations.length === 0 ? (
                  <div className="sm:col-span-3">
                    <EmptyState icon={CalendarDays} title="No leave allocations" description="This employee has no leave balance allocated yet." />
                  </div>
                ) : leave.allocations.map((a) => (
                  <div key={a.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-semibold text-gray-900">{a.leaveTypeName}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{a.remaining}</p>
                    <p className="text-xs text-gray-500">remaining of {a.allocated} allocated</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Leave Requests</h3>
                {leave.requests.length === 0 ? (
                  <p className="text-sm text-gray-400">No leave requests found.</p>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                    {leave.requests.map((r) => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                        <span className="text-gray-900 font-medium">{r.leaveTypeName}</span>
                        <span className="text-gray-500">{r.startDate} – {r.endDate}</span>
                        <span className="text-gray-500">{r.duration} {r.unit}</span>
                        <Badge variant={r.status === 'Approved' ? 'success' : r.status === 'Pending' ? 'warning' : 'default'}>
                          {r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'contract' && (
        <div className="space-y-4">
          {contracts.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <ContractTable data={contracts} hideEmployee={true} />
            </div>
          ) : (
            <EmptyState icon={FileText} title="No contracts found" description="This employee does not have any active or historical contracts." />
          )}
        </div>
      )}

      {activeTab === 'salary' && (
        <div className="space-y-4">
          {salaryStructures.loading && <div className="flex justify-center py-8"><Spinner /></div>}
          {!salaryStructures.loading && (
            latestContract?.salary ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">Current Salary</h2>
                <InfoRow icon={Wallet} label="Wage" value={money(latestContract.salary)} />
              </div>
            ) : (
              <EmptyState icon={Wallet} title="No salary data" description="No salary structure is assigned to this employee's contract." />
            )
          )}
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className="space-y-4">
          {payslips.loading && <div className="flex justify-center py-8"><Spinner /></div>}
          {!payslips.loading && payslips.data.length === 0 && (
            <EmptyState icon={Receipt} title="No payslips yet" description="Payslips will appear here once a payrun including this employee is processed." />
          )}
          {!payslips.loading && payslips.data.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {payslips.data.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-gray-900 font-medium">{p.period_start} – {p.period_end}</span>
                  <span className="text-gray-500">{money(p.net_amount)}</span>
                  <Badge variant={p.status === 'PAID' ? 'success' : 'default'}>{p.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => !isSubmitting && setIsFormModalOpen(false)}
        title="Edit Employee"
        className="max-w-3xl"
      >
        <EmployeeForm
          initialData={employee || {}}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsFormModalOpen(false)}
          isLoading={isSubmitting}
          refData={refData}
        />
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={isDeactivateModalOpen}
        onClose={() => !isSubmitting && setIsDeactivateModalOpen(false)}
        title="Deactivate Employee"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to deactivate <strong>{employee?.firstName} {employee?.lastName}</strong>?
            This will mark them as inactive but will not delete their records.
          </p>
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsDeactivateModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDeactivate} isLoading={isSubmitting} disabled={isSubmitting}>
              Deactivate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
