import * as React from "react";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";

export function EmployeeFilters({ filters, setFilters, refData, onClear }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const hasActiveFilters = filters.department || filters.position || filters.status || filters.employeeType || filters.manager;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 bg-white p-4 rounded-lg border border-gray-200 mb-4">
      
      <Select 
        name="department"
        value={filters.department}
        onChange={handleChange}
        options={(refData?.departments || []).map(d => ({ value: d, label: d }))}
        className="w-full"
      />
      <Select 
        name="position"
        value={filters.position}
        onChange={handleChange}
        options={(refData?.positions || []).map(p => ({ value: p, label: p }))}
        className="w-full"
      />
      <Select 
        name="status"
        value={filters.status}
        onChange={handleChange}
        options={(refData?.statuses || []).map(s => ({ value: s, label: s }))}
        className="w-full"
      />
      <Select 
        name="employeeType"
        value={filters.employeeType}
        onChange={handleChange}
        options={(refData?.employeeTypes || []).map(e => ({ value: e, label: e }))}
        className="w-full"
      />
      <Select 
        name="manager"
        value={filters.manager}
        onChange={handleChange}
        options={refData?.managers || []}
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
