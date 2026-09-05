import * as React from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";

export function Employees() {
  return (
    <div>
      <PageHeader 
        title="Employees" 
        description="Manage your workforce" 
        actions={<Button>Add Employee</Button>}
      />
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
        Employee management module will be implemented here.
      </div>
    </div>
  );
}
