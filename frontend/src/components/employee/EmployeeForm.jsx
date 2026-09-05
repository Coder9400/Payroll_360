import * as React from "react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";

export function EmployeeForm({ 
  initialData = {}, 
  onSubmit, 
  onCancel, 
  isLoading, 
  refData 
}) {
  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    employeeId: "",
    department: "",
    position: "",
    manager: "",
    employeeType: "Full Time",
    joiningDate: "",
    status: "Active",
    workEmail: "",
    workPhone: "",
    ...initialData
  });

  const [errors, setErrors] = React.useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.employeeId.trim()) newErrors.employeeId = "Employee ID is required";
    if (!formData.department) newErrors.department = "Department is required";
    if (!formData.position) newErrors.position = "Job position is required";
    if (!formData.joiningDate) newErrors.joiningDate = "Joining date is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Info */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">
          Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            name="firstName"
            placeholder="First Name *"
            value={formData.firstName}
            onChange={handleChange}
            error={errors.firstName}
          />
          <Input 
            name="lastName"
            placeholder="Last Name *"
            value={formData.lastName}
            onChange={handleChange}
            error={errors.lastName}
          />
          <Input 
            name="email"
            type="email"
            placeholder="Personal Email *"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
          />
          <Input 
            name="phone"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
          />
          <Input 
            name="dob"
            type="date"
            placeholder="Date of Birth"
            value={formData.dob}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Job Info */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">
          Job Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            name="employeeId"
            placeholder="Employee ID *"
            value={formData.employeeId}
            onChange={handleChange}
            error={errors.employeeId}
          />
          <Input 
            name="joiningDate"
            type="date"
            placeholder="Joining Date *"
            value={formData.joiningDate}
            onChange={handleChange}
            error={errors.joiningDate}
          />
          <Select 
            name="department"
            value={formData.department}
            onChange={handleChange}
            options={(refData?.departments || []).map(d => ({ value: d, label: d }))}
            error={errors.department}
            className="w-full"
          />
          <Select 
            name="position"
            value={formData.position}
            onChange={handleChange}
            options={(refData?.positions || []).map(p => ({ value: p, label: p }))}
            error={errors.position}
            className="w-full"
          />
          <Select 
            name="manager"
            value={formData.manager}
            onChange={handleChange}
            options={refData?.managers || []}
            className="w-full"
          />
          <Select 
            name="employeeType"
            value={formData.employeeType}
            onChange={handleChange}
            options={(refData?.employeeTypes || []).map(e => ({ value: e, label: e }))}
            className="w-full"
          />
          <Select 
            name="status"
            value={formData.status}
            onChange={handleChange}
            options={(refData?.statuses || []).map(s => ({ value: s, label: s }))}
            className="w-full"
          />
        </div>
      </div>

      {/* Work Info */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">
          Work Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            name="workEmail"
            type="email"
            placeholder="Work Email"
            value={formData.workEmail}
            onChange={handleChange}
          />
          <Input 
            name="workPhone"
            placeholder="Work Phone"
            value={formData.workPhone}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading} disabled={isLoading}>
          {initialData.id ? "Save Changes" : "Create Employee"}
        </Button>
      </div>
    </form>
  );
}
