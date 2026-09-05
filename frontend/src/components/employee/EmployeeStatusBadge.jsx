import * as React from "react";
import { Badge } from "../ui/Badge";
import { formatEnum } from "../../utils/formatLabel";

export function EmployeeStatusBadge({ status, className }) {
  let variant = "gray";
  const key = status?.toLowerCase().replace(/_/g, ' ');

  switch (key) {
    case "active":
      variant = "success";
      break;
    case "inactive":
      variant = "gray";
      break;
    case "on leave":
      variant = "warning";
      break;
    case "probation":
      variant = "info";
      break;
    case "terminated":
      variant = "danger";
      break;
    default:
      variant = "gray";
  }

  return (
    <Badge variant={variant} className={className}>
      {formatEnum(status) || "Unknown"}
    </Badge>
  );
}
