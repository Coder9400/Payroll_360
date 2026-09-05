import * as React from "react";
import { Link } from "react-router-dom";
import { Table } from "../ui/Table";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

export function LeaveRequestStatusBadge({ status }) {
  switch (status) {
    case "Pending":
      return <Badge variant="yellow">Pending</Badge>;
    case "Approved":
      return <Badge variant="green">Approved</Badge>;
    case "Rejected":
      return <Badge variant="red">Rejected</Badge>;
    case "Cancelled":
      return <Badge variant="gray">Cancelled</Badge>;
    default:
      return <Badge variant="gray">{status}</Badge>;
  }
}

export function LeaveRequestTable({ 
  data, 
  isLoading, 
  hideEmployee = false, 
  onSort, 
  sortField, 
  sortDirection,
  onActionClick 
}) {
  
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
      key: "dates",
      label: "Dates",
      sortable: false,
      render: (row) => (
        <div className="text-sm text-gray-700 whitespace-nowrap">
          {new Date(row.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} 
          {' - '} 
          {new Date(row.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </div>
      ),
    },
    {
      key: "duration",
      label: "Duration",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-700 font-medium">
          {row.duration} {row.duration === 1 ? 'day' : 'days'}
        </span>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      sortable: false,
      render: (row) => (
        <span className="text-sm text-gray-500 line-clamp-1 max-w-[200px]" title={row.reason}>
          {row.reason}
        </span>
      ),
    },
    {
      key: "submittedAt",
      label: "Submitted",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {new Date(row.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => <LeaveRequestStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (row) => (
        <div className="flex justify-end space-x-2">
          {onActionClick ? (
            <Button size="sm" variant="outline" onClick={() => onActionClick(row)}>
              {row.status === 'Pending' ? 'Review' : 'View'}
            </Button>
          ) : (
            <Link to={`/time-off/requests/${row.id}`}>
              <Button size="sm" variant="outline">
                View
              </Button>
            </Link>
          )}
        </div>
      ),
    }
  ];

  return (
    <Table
      columns={[...columns, ...commonColumns]}
      data={data}
      keyExtractor={(item) => item.id}
      isLoading={isLoading}
      emptyMessage="No leave requests found."
      onSort={onSort}
      sortField={sortField}
      sortDirection={sortDirection}
    />
  );
}
