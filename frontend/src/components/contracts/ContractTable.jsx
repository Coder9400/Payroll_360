import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { DataTable } from "../ui/DataTable";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { ContractStatusBadge } from "./ContractStatusBadge";

export function ContractTable({ 
  data, 
  isLoading, 
  hideEmployee = false, 
  onSort, 
  sortField, 
  sortDirection 
}) {
  const navigate = useNavigate();
  
  const columns = hideEmployee ? [] : [
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
    }
  ];

  const commonColumns = [
    {
      key: "jobPosition",
      label: "Position",
      sortable: true,
      render: (row) => (
        <div className="text-sm text-gray-900">
          <div className="font-medium">{row.jobPosition}</div>
          <div className="text-gray-500 text-xs">{row.department}</div>
        </div>
      ),
    },
    {
      key: "dates",
      label: "Duration",
      sortable: false,
      render: (row) => (
        <div className="text-sm text-gray-700 whitespace-nowrap">
          {new Date(row.startDate).toLocaleDateString('en-GB')} - {row.endDate ? new Date(row.endDate).toLocaleDateString('en-GB') : 'Ongoing'}
        </div>
      ),
    },
    {
      key: "salary",
      label: "Salary",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-700 font-medium">
          ₹{row.salary.toLocaleString('en-IN')} / {row.wageType === 'Monthly' ? 'mo' : 'hr'}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => <ContractStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (row) => (
        <div className="flex justify-end space-x-2">
          <Button size="sm" variant="outline" onClick={() => navigate(`/contracts/${row.id}`)}>
            View Details
          </Button>
        </div>
      ),
    }
  ];

  return (
    <DataTable
      columns={[...columns, ...commonColumns]}
      data={data}
      keyExtractor={(item) => item.id}
      isLoading={isLoading}
      emptyMessage="No contracts found."
      onSort={onSort}
      sortField={sortField}
      sortDirection={sortDirection}
    />
  );
}
