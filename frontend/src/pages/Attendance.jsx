import * as React from "react";
import { PageHeader } from "../components/layout/PageHeader";

export function Attendance() {
  return (
    <div>
      <PageHeader title="Attendance" description="Track employee attendance and working hours" />
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
        Attendance module will be implemented here.
      </div>
    </div>
  );
}
