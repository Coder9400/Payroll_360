import * as React from "react";
import { PageHeader } from "../components/layout/PageHeader";

export function Dashboard() {
  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of HR and Payroll metrics" />
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
        Dashboard content will be implemented here.
      </div>
    </div>
  );
}
