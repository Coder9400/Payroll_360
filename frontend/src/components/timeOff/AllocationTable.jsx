import * as React from "react";
import { Table } from "../ui/Table";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

export function AllocationTable({ 
  data, 
  isLoading, 
  onSort, 
  sortField, 
  sortDirection,
  onEdit
}) {
  
  const columns = [
    {
      key: "employee",
      label: "Employee",
      sortable: true,
      render: (row) => (
        <div className="flex items-center">
          <Avatar 
            fallback={`${row.employeeName.split(' ')[0][0]}${row.employeeName.split(' ')[1]?.[0] || ''}`}
            className="h-8 w-8 mr-3 bg-primary-100 text-primary-700 font-medium"
          />
          <div>
            <span className="text-sm font-medium text-gray-900 block">{row.employeeName}</span>
            <span className="text-xs text-gray-500 block">{row.employeeId}</span>
          </div>
        </div>
      ),
    },
    {
      key: "leaveType",
      label: "Leave Type",
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
          {row.leaveTypeName}
        </span>
      ),
    },
    {
      key: "year",
      label: "Year",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-700">
          {row.year}
        </span>
      ),
    },
    {
      key: "allocated",
      label: "Allocated",
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">
          {row.allocated} days
        </span>
      ),
    },
    {
      key: "used",
      label: "Used",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-700">
          {row.used} days
        </span>
      ),
    },
    {
      key: "pending",
      label: "Pending",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-700">
          {row.pending} days
        </span>
      ),
    },
    {
      key: "remaining",
      label: "Remaining",
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium text-primary-700">
          {row.remaining} days
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === 'Active' ? 'green' : 'gray'}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (row) => (
        <div className="flex justify-end">
          {onEdit && (
            <Button size="sm" variant="outline" onClick={() => onEdit(row)}>
              Edit
            </Button>
          )}
        </div>
      ),
    }
  ];

  return (
    <Table
      columns={columns}
      data={data}
      keyExtractor={(item) => item.id}
      isLoading={isLoading}
      emptyMessage="No leave allocations found."
      onSort={onSort}
      sortField={sortField}
      sortDirection={sortDirection}
    />
  );
}
