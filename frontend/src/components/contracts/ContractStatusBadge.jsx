import * as React from "react";
import { Badge } from "../ui/Badge";

export function ContractStatusBadge({ status }) {
  switch (status) {
    case "Draft":
      return <Badge variant="gray">Draft</Badge>;
    case "Running":
      return <Badge variant="green">Running</Badge>;
    case "Expired":
      return <Badge variant="yellow">Expired</Badge>;
    case "Cancelled":
      return <Badge variant="red">Cancelled</Badge>;
    default:
      return <Badge variant="gray">{status}</Badge>;
  }
}
