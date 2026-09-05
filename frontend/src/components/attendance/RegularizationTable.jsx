import * as React from "react";
import { Link } from "react-router-dom";
import { Table } from "../ui/Table";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { formatTime } from "../../utils/timeUtils";
import { Check, X } from "lucide-react";

export function RegularizationStatusBadge({ status }) {
  switch (status) {
    case "Pending":
      return <Badge variant="yellow">Pending</Badge>;
    case "Approved":
      return <Badge variant="green">Approved</Badge>;
    case "Rejected":
      return <Badge variant="red">Rejected</Badge>;
    default:
      return <Badge variant="gray">{status}</Badge>;
  }
}

export function RegularizationTable({ 
  data, 
  isLoading, 
  hideEmployee = false, 
  onReview 
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
            <Link 
              to={`/attendance/${row.employeeId}`} 
              className="text-sm font-medium text-gray-900 hover:text-primary-600 hover:underline"
            >
              {row.employeeName}
            </Link>
            <div className="text-xs text-gray-500">{row.employeeId}</div>
          </div>
        </div>
      ),
    }
  ];

  columns.push(
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-700 whitespace-nowrap">
          {new Date(row.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: "original",
      label: "Original (In - Out)",
      sortable: false,
      render: (row) => (
        <span className="text-sm text-gray-500 line-through whitespace-nowrap">
          {formatTime(row.originalCheckIn)} - {formatTime(row.originalCheckOut)}
        </span>
      ),
    },
    {
      key: "requested",
      label: "Requested (In - Out)",
      sortable: false,
      render: (row) => (
        <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
          {formatTime(row.requestedCheckIn)} - {formatTime(row.requestedCheckOut)}
        </span>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      sortable: false,
      render: (row) => (
        <span className="text-sm text-gray-600 line-clamp-2 max-w-xs" title={row.reason}>
          {row.reason}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => <RegularizationStatusBadge status={row.status} />,
    }
  );

  if (onReview) {
    columns.push({
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => (
        <div className="flex items-center space-x-2">
          {row.status === "Pending" ? (
            <Button size="sm" variant="outline" onClick={() => onReview(row)}>
              Review
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => onReview(row)}>
              View
            </Button>
          )}
        </div>
      ),
    });
  }

  return (
    <Table
      columns={columns}
      data={data}
      keyExtractor={(item) => item.id}
      isLoading={isLoading}
      emptyMessage="No regularization requests found."
    />
  );
}
