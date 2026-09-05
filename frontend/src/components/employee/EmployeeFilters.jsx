import * as React from "react";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { employeeTypeOptions, statusOptions } from "../../utils/formatLabel";

export function EmployeeFilters({ filters, setFilters, refData, onClear }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const hasActiveFilters = filters.department || filters.position || filters.status || filters.employeeType || filters.manager;

  const departmentOptions = (refData?.departmentOptions || []).map((d) => ({
    value: d.id,
    label: d.label ?? d.name,
  }));

  // Deduplicate by id — the backend can return the same position for multiple employees
  const positionOptions = Array.from(
    new Map(
      (refData?.positionOptions || []).map((p) => [p.id, p])
    ).values()
  ).map((p) => ({
    value: p.id,
    label: p.label ?? p.name,
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 bg-white p-4 rounded-lg border border-gray-200 mb-4">
      <Select
        name="department"
        label="Department"
        value={filters.department}
        onChange={handleChange}
        options={departmentOptions}
        placeholder="All departments"
        className="w-full"
      />
      <Select
        name="position"
        label="Job position"
        value={filters.position}
        onChange={handleChange}
        options={positionOptions}
        placeholder="All positions"
        className="w-full"
      />
      <Select
        name="manager"
        label="Manager"
        value={filters.manager}
        onChange={handleChange}
        options={refData?.managers || []}
        placeholder="All managers"
        className="w-full"
      />
      <Select
        name="employeeType"
        label="Type"
        value={filters.employeeType}
        onChange={handleChange}
        options={employeeTypeOptions()}
        placeholder="All types"
        className="w-full"
      />
      <Select
        name="status"
        label="Status"
        value={filters.status}
        onChange={handleChange}
        options={statusOptions()}
        placeholder="All statuses"
        className="w-full"
      />

      {hasActiveFilters && (
        <div className="flex items-end">
           <Button variant="outline" onClick={onClear} className="w-full sm:w-auto h-10">
              Clear
           </Button>
        </div>
      )}
    </div>
  );
}
