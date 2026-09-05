import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { employeeService } from "../services/employeeService";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { EmployeeStatusBadge } from "../components/employee/EmployeeStatusBadge";
import { Spinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { EmployeeForm } from "../components/employee/EmployeeForm";
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
  LayoutDashboard
} from "lucide-react";

// Fallback dummy toast hook for now
const useToast = () => {
  return {
    toast: ({ title, description }) => {
      // alert(`${title}${description ? ': ' + description : ''}`);
      console.log('Toast:', title, description);
    }
  };
};

export function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [employee, setEmployee] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  
  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [refData, setRefData] = React.useState(null);

  const fetchEmployee = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await employeeService.getEmployee(id);
      setEmployee(data);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load employee details.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

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

      {/* Smart Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to={`/employees/${id}/contracts`} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center hover:shadow-md transition-shadow group">
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 mr-3">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Contracts</h3>
            <p className="text-xs text-gray-500 mt-0.5">View</p>
          </div>
        </Link>
        <Link to={`/attendance?employee=${id}`} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center hover:shadow-md transition-shadow group">
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 mr-3">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Attendance</h3>
            <p className="text-xs text-gray-500 mt-0.5">View</p>
          </div>
        </Link>
        <Link to={`/time-off/requests?employee=${id}`} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center hover:shadow-md transition-shadow group">
          <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 mr-3">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Time Off</h3>
            <p className="text-xs text-gray-500 mt-0.5">Requests</p>
          </div>
        </Link>
        <Link to={`/time-off/allocations?employee=${id}`} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center hover:shadow-md transition-shadow group">
          <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 mr-3">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Allocations</h3>
            <p className="text-xs text-gray-500 mt-0.5">View</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">Job Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-sm text-gray-500 flex items-center"><Building className="h-4 w-4 mr-2" /> Department</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{employee.department}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center"><Briefcase className="h-4 w-4 mr-2" /> Job Position</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{employee.position}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center"><User className="h-4 w-4 mr-2" /> Manager</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {employee.managerName || <span className="text-gray-400">None</span>}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center"><Briefcase className="h-4 w-4 mr-2" /> Employee Type</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{employee.employeeType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center"><Calendar className="h-4 w-4 mr-2" /> Joining Date</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {new Date(employee.joiningDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-sm text-gray-500 flex items-center"><User className="h-4 w-4 mr-2" /> Full Name</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{employee.firstName} {employee.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center"><Mail className="h-4 w-4 mr-2" /> Email</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  <a href={`mailto:${employee.email}`} className="text-primary-600 hover:underline">{employee.email}</a>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center"><Phone className="h-4 w-4 mr-2" /> Phone</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {employee.phone || <span className="text-gray-400">Not provided</span>}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center"><Calendar className="h-4 w-4 mr-2" /> Date of Birth</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {employee.dob ? new Date(employee.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : <span className="text-gray-400">Not provided</span>}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Work Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">Work Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 flex items-center"><Mail className="h-4 w-4 mr-2" /> Work Email</p>
                <p className="text-sm font-medium text-gray-900 mt-1 break-all">
                  {employee.workEmail ? (
                    <a href={`mailto:${employee.workEmail}`} className="text-primary-600 hover:underline">{employee.workEmail}</a>
                  ) : (
                    <span className="text-gray-400">Not provided</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center"><Phone className="h-4 w-4 mr-2" /> Work Phone</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {employee.workPhone || <span className="text-gray-400">Not provided</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
