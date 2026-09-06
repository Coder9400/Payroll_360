/**
 * AttendanceMapPage.jsx
 * 
 * Full-page wrapper for the HR geofenced attendance map view.
 * Accessible via /attendance/map  (HR+ roles only).
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { AttendanceMap } from '../components/attendance/AttendanceMap';
import { MapPin, List, AlertTriangle } from 'lucide-react';

export function AttendanceMapPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Page header with tab-style navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Attendance Map"
          description="Real-time geofenced check-in locations for today."
        />
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/attendance')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <List className="h-4 w-4" />
            List View
          </button>
          <button
            onClick={() => navigate('/attendance/map')}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            <MapPin className="h-4 w-4" />
            Map View
          </button>
        </div>
      </div>

      {/* Info banner about geofencing */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <span className="font-semibold">Geofencing is active.</span>{' '}
          Employees outside the configured office radius are blocked from checking in.
          Only check-ins with GPS coordinates are shown on this map. Go to{' '}
          <button
            onClick={() => navigate('/settings')}
            className="underline font-medium hover:text-amber-900"
          >
            Settings
          </button>{' '}
          to configure the office location and allowed radius.
        </div>
      </div>

      {/* The map */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <AttendanceMap />
      </div>
    </div>
  );
}
