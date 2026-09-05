import * as React from 'react';
import { PageHeader } from '../components/layout/PageHeader';

export function Attendance() {
  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Track and manage employee attendance records"
      />
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center text-gray-500">
        <p className="text-sm font-medium text-gray-600">Attendance Management</p>
        <p className="text-xs text-gray-400 mt-1">Will be implemented in Phase 03</p>
      </div>
    </div>
  );
}
