import * as React from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";

const DEPARTMENTS = [
  "All Departments",
  "Engineering",
  "Design",
  "Product",
  "Marketing",
  "Sales",
  "HR",
];

const STATUSES = [
  "All Statuses",
  "Present",
  "Absent",
  "Late",
  "Half Day",
  "Leave",
  "Missing Checkout",
];

const DATE_RANGES = [
  "Today",
  "Yesterday",
  "This Week",
  "This Month",
  "Custom Date Range"
];

export function AttendanceFilters({ filters, onFilterChange }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSearchChange = (e) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const clearFilters = () => {
    onFilterChange({
      search: "",
      department: "All Departments",
      status: "All Statuses",
      dateRange: "Today",
    });
  };

  const hasActiveFilters =
    filters.department !== "All Departments" ||
    filters.status !== "All Statuses" ||
    filters.dateRange !== "Today";

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search by name or ID..."
            className="pl-10 w-full"
            value={filters.search}
            onChange={handleSearchChange}
          />
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:flex items-center gap-3">
          <Select
            value={filters.dateRange}
            onChange={(e) => onFilterChange({ ...filters, dateRange: e.target.value })}
            className="w-40"
          >
            {DATE_RANGES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>

          <Select
            value={filters.department}
            onChange={(e) => onFilterChange({ ...filters, department: e.target.value })}
            className="w-44"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>

          <Select
            value={filters.status}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
            className="w-40"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="text-gray-500">
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Mobile Filters Toggle */}
        <Button
          variant="outline"
          className="md:hidden flex items-center justify-center"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Mobile Filters Expanded */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
            <Select
              value={filters.dateRange}
              onChange={(e) => onFilterChange({ ...filters, dateRange: e.target.value })}
              className="w-full"
            >
              {DATE_RANGES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
            <Select
              value={filters.department}
              onChange={(e) => onFilterChange({ ...filters, department: e.target.value })}
              className="w-full"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <Select
              value={filters.status}
              onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
              className="w-full"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          
          <div className="pt-5">
            <Button variant="outline" className="w-full" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
