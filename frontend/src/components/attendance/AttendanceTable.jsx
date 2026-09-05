import * as React from "react";
import { Link } from "react-router-dom";
import { Table } from "../ui/Table";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { formatTime, formatHours } from "../../utils/timeUtils";
import { Clock, CheckCircle, XCircle, AlertCircle, FileWarning } from "lucide-react";

export function getStatusConfig(status) {
  switch (status) {
    case "Present": return { color: "green", icon: CheckCircle };
    case "Absent": return { color: "red", icon: XCircle };
    case "Late": return { color: "yellow", icon: Clock };
    case "Half Day": return { color: "blue", icon: Clock };
    case "Leave": return { color: "purple", icon: FileWarning };
    case "Missing Checkout": return { color: "orange", icon: AlertCircle };
    default: return { color: "gray", icon: Clock };
  }
}

export function AttendanceStatusBadge({ status }) {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  return (
    <Badge variant={config.color} className="flex w-fit items-center whitespace-nowrap">
      <Icon className="mr-1 h-3 w-3" />
      {status}
    </Badge>
  );
}

export function AttendanceTable({ data, isLoading, onSort, sortField, sortDirection, hideEmployee = false }) {
  
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
      key: "checkIn",
      label: "Check In",
      sortable: false,
      render: (row) => (
        <span className="text-sm text-gray-700 whitespace-nowrap">{formatTime(row.checkIn)}</span>
      ),
    },
    {
      key: "checkOut",
      label: "Check Out",
      sortable: false,
      render: (row) => (
        <span className="text-sm text-gray-700 whitespace-nowrap">{formatTime(row.checkOut)}</span>
      ),
    },
    {
      key: "scheduledHours",
      label: "Scheduled",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-700">{formatHours(row.scheduledHours)}</span>
      ),
    },
    {
      key: "workedHours",
      label: "Worked",
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">{formatHours(row.workedHours)}</span>
      ),
    },
    {
      key: "overtime",
      label: "Overtime",
      sortable: true,
      render: (row) => {
        const val = row.overtime;
        if (!val || val === 0) return <span className="text-sm text-gray-400">-</span>;
        return <span className="text-sm font-medium text-amber-600">{formatHours(val)}</span>;
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => <AttendanceStatusBadge status={row.status} />,
    }
  );

  return (
    <Table
      columns={columns}
      data={data}
      keyExtractor={(item) => item.id}
      isLoading={isLoading}
      emptyMessage="No attendance records found."
      onSort={onSort}
      sortField={sortField}
      sortDirection={sortDirection}
    />
  );
}
