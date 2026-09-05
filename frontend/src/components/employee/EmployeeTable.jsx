import * as React from "react";
import { Link } from "react-router-dom";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "../ui/Table";
import { Avatar } from "../ui/Avatar";
import { EmployeeStatusBadge } from "./EmployeeStatusBadge";
import { EmptyState } from "../ui/EmptyState";
import { Spinner } from "../ui/Spinner";
import { Eye, Edit, PowerOff } from "lucide-react";

export function EmployeeTable({ employees, isLoading, onEdit, onDeactivate, sortConfig, onSort }) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg border border-gray-200">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!employees?.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <EmptyState 
          title="No employees found" 
          description="Try changing your filters or search criteria." 
        />
      </div>
    );
  }

  const renderSortableHead = (field, label) => {
    const isSorted = sortConfig?.sortBy === field;
    const direction = isSorted ? sortConfig.sortOrder : null;
    
    return (
      <TableHead 
        className="cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => onSort(field)}
      >
        <div className="flex items-center space-x-1">
          <span>{label}</span>
          <span className="text-xs text-gray-400">
            {direction === 'asc' ? '↑' : direction === 'desc' ? '↓' : '↕'}
          </span>
        </div>
      </TableHead>
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {renderSortableHead('name', 'Employee')}
          {renderSortableHead('employeeId', 'Employee ID')}
          {renderSortableHead('department', 'Department')}
          {renderSortableHead('position', 'Job Position')}
          <TableHead>Manager</TableHead>
          {renderSortableHead('employeeType', 'Type')}
          {renderSortableHead('joiningDate', 'Joining Date')}
          {renderSortableHead('status', 'Status')}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((emp) => (
          <TableRow key={emp.id}>
            <TableCell>
              <div className="flex items-center space-x-3">
                <Avatar 
                  fallback={`${emp.firstName[0]}${emp.lastName[0]}`} 
                  className="h-8 w-8"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    {emp.firstName} {emp.lastName}
                  </span>
                  <a href={`mailto:${emp.email}`} className="text-xs text-gray-500 hover:text-primary-600 truncate max-w-[150px]">
                    {emp.email}
                  </a>
                </div>
              </div>
            </TableCell>
            <TableCell className="font-medium text-gray-600">{emp.employeeId}</TableCell>
            <TableCell>{emp.department}</TableCell>
            <TableCell>{emp.position}</TableCell>
            <TableCell>
              <div className="text-sm">
                 {emp.managerName || <span className="text-gray-400">None</span>}
              </div>
            </TableCell>
            <TableCell>{emp.employeeType}</TableCell>
            <TableCell>
               {new Date(emp.joiningDate).toLocaleDateString('en-GB', { 
                  day: 'numeric', month: 'short', year: 'numeric' 
               })}
            </TableCell>
            <TableCell>
              <EmployeeStatusBadge status={emp.status} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end space-x-2">
                <Link 
                  to={`/employees/${emp.id}`}
                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                  title="View Profile"
                >
                  <Eye className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => onEdit(emp)}
                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeactivate(emp)}
                  disabled={emp.status === 'Inactive' || emp.status === 'Terminated'}
                  className="p-1.5 text-gray-400 hover:text-danger hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Deactivate"
                >
                  <PowerOff className="h-4 w-4" />
                </button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
