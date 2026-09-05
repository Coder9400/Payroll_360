import * as React from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { EmployeeTable } from "../components/employee/EmployeeTable";
import { EmployeeFilters } from "../components/employee/EmployeeFilters";
import { EmployeeForm } from "../components/employee/EmployeeForm";
import { employeeService } from "../services/employeeService";
import { Search } from "lucide-react";

// Fallback dummy toast hook for now
const useToast = () => {
  return {
    toast: ({ title, description }) => {
      // alert(`${title}${description ? ': ' + description : ''}`);
      console.log('Toast:', title, description);
    }
  };
};

export function Employees() {
  const { toast } = useToast();
  
  // Data State
  const [employees, setEmployees] = React.useState([]);
  const [refData, setRefData] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [pagination, setPagination] = React.useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  
  // Filters State
  const [filters, setFilters] = React.useState({
    search: "",
    department: "",
    position: "",
    status: "",
    employeeType: "",
    manager: "",
    page: 1,
    limit: 10,
    sortBy: "joiningDate",
    sortOrder: "desc"
  });

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState(null);

  const fetchEmployees = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await employeeService.getEmployees(filters);
      setEmployees(response.data);
      setPagination(response.meta);
    } catch (error) {
      toast({
        title: "Error loading employees",
        description: error.message,
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  React.useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

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

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleSort = (field) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1
    }));
  };

  const handleClearFilters = () => {
    setFilters(prev => ({
      ...prev,
      department: "",
      position: "",
      status: "",
      employeeType: "",
      manager: "",
      page: 1
    }));
  };

  // Actions
  const handleOpenCreate = () => {
    setSelectedEmployee(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setSelectedEmployee(emp);
    setIsFormModalOpen(true);
  };

  const handleOpenDeactivate = (emp) => {
    setSelectedEmployee(emp);
    setIsDeactivateModalOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (selectedEmployee) {
        await employeeService.updateEmployee(selectedEmployee.id, formData);
        toast({ title: "Employee updated successfully", type: "success" });
      } else {
        await employeeService.createEmployee(formData);
        toast({ title: "Employee created successfully", type: "success" });
      }
      setIsFormModalOpen(false);
      fetchEmployees();
    } catch (error) {
      toast({
        title: selectedEmployee ? "Error updating employee" : "Error creating employee",
        description: error.message,
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!selectedEmployee) return;
    setIsSubmitting(true);
    try {
      await employeeService.deactivateEmployee(selectedEmployee.id);
      toast({ title: "Employee deactivated", type: "success" });
      setIsDeactivateModalOpen(false);
      fetchEmployees();
    } catch (error) {
      toast({
        title: "Error deactivating employee",
        description: error.message,
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Employees" 
        description="Manage employee information, departments, positions and reporting relationships." 
        actions={<Button onClick={handleOpenCreate}>Add Employee</Button>}
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search employees..." 
            value={filters.search}
            onChange={handleSearchChange}
            className="pl-9 w-full"
          />
        </div>
      </div>

      <EmployeeFilters 
        filters={filters} 
        setFilters={setFilters} 
        refData={refData} 
        onClear={handleClearFilters}
      />

      <EmployeeTable 
        employees={employees}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDeactivate={handleOpenDeactivate}
        sortConfig={{ sortBy: filters.sortBy, sortOrder: filters.sortOrder }}
        onSort={handleSort}
      />

      {/* Pagination */}
      {!isLoading && employees.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg mt-4">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button 
              variant="outline" 
              onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <Button 
              variant="outline"
              onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                <span className="font-medium">{pagination.totalPages}</span> 
                {' '}(Total: {pagination.total})
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <Button 
                  variant="outline" 
                  className="rounded-l-md rounded-r-none border-r-0"
                  onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  className="rounded-r-md rounded-l-none"
                  onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <Modal 
        isOpen={isFormModalOpen}
        onClose={() => !isSubmitting && setIsFormModalOpen(false)}
        title={selectedEmployee ? "Edit Employee" : "Add Employee"}
        className="max-w-3xl"
      >
        <EmployeeForm 
          initialData={selectedEmployee || {}}
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
            Are you sure you want to deactivate <strong>{selectedEmployee?.firstName} {selectedEmployee?.lastName}</strong>? 
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
