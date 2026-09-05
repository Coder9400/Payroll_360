import * as React from "react";
import { DataTable } from "../ui/DataTable";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

export function LeaveTypeTable({ 
  data, 
  isLoading, 
  onSort, 
  sortField, 
  sortDirection,
  onEdit
}) {
  
  const columns = [
    {
      key: "name",
      label: "Leave Type",
      sortable: true,
      render: (row) => (
        <div>
          <span className="text-sm font-medium text-gray-900 block">{row.name}</span>
          <span className="text-xs text-gray-500 block">Code: {row.code}</span>
        </div>
      ),
    },
    {
      key: "isPaid",
      label: "Pay Type",
      sortable: true,
      render: (row) => (
        <Badge variant={row.isPaid ? 'green' : 'gray'}>
          {row.isPaid ? 'Paid' : 'Unpaid'}
        </Badge>
      ),
    },
    {
      key: "requiresAllocation",
      label: "Allocation",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-700">
          {row.requiresAllocation ? 'Required' : 'No Allocation'}
        </span>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={row.isActive ? 'green' : 'red'}>
          {row.isActive ? 'Active' : 'Inactive'}
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
    <DataTable
      columns={columns}
      data={data}
      keyExtractor={(item) => item.id}
      isLoading={isLoading}
      emptyMessage="No leave types found."
      onSort={onSort}
      sortField={sortField}
      sortDirection={sortDirection}
    />
  );
}
