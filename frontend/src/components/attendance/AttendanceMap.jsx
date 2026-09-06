/**
 * AttendanceMap.jsx
 * 
 * HR/Admin live map view of today's employee check-ins.
 * Shows a Leaflet map with a circle marking the geofence,
 * the office pin, and individual employee markers with popups.
 * 
 * Depends on: leaflet, react-leaflet
 */

import * as React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { attendanceService } from '../../services/attendanceService';
import api from '../../services/api';

// ─── Fix leaflet default icon missing in Vite ────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Office icon (blue)
const officeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Employee icon (green = on-time, orange = late, grey = missing checkout)
function getEmployeeIcon(status) {
  const colorMap = {
    'Present': 'green',
    'Late': 'orange',
    'Overtime': 'violet',
    'Missing Checkout': 'grey',
    'Half Day': 'yellow',
  };
  const color = colorMap[status] || 'green';
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Adjust map view when office coords load
function MapCenter({ center, zoom }) {
  const map = useMap();
  React.useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, map, zoom]);
  return null;
}

export function AttendanceMap() {
  const [records, setRecords] = React.useState([]);
  const [officeConfig, setOfficeConfig] = React.useState(null);
  const [officeNotConfigured, setOfficeNotConfigured] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [lastRefreshed, setLastRefreshed] = React.useState(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = React.useCallback(async () => {
    try {
      // Fetch today's attendance with location data
      const result = await attendanceService.getAttendance({
        date_from: today,
        date_to: today,
        limit: 200,
      });

      const withLocation = (result.data || []).filter(r => r.checkInLat && r.checkInLng);
      setRecords(withLocation);

      // Fetch tenant's office config
      const configRes = await api.get('/settings/geofence');
      const cfg = configRes.data?.data;
      if (cfg && cfg.officeLat && cfg.officeLng) {
        setOfficeConfig(cfg);
        setOfficeNotConfigured(false);
      } else {
        setOfficeNotConfigured(true);
      }

      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load map data', err);
      setError('Unable to load attendance map. ' + (err?.message || ''));
    } finally {
      setIsLoading(false);
    }
  }, [today]);

  React.useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // Refresh every 5 mins
    return () => clearInterval(interval);
  }, [fetchData]);

  // If office not configured, use a sensible India default center for the map
  const defaultCenter = officeConfig
    ? [officeConfig.officeLat, officeConfig.officeLng]
    : [23.1935, 72.6288]; // Ahmedabad office

  const geofenceRadius = officeConfig?.geofenceRadius || 500;

  const statusColors = {
    'Present': '#22c55e',
    'Late': '#f97316',
    'Overtime': '#8b5cf6',
    'Missing Checkout': '#6b7280',
    'Half Day': '#eab308',
  };

  const statusCounts = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Live Attendance Map</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {today} · {records.length} employee check-ins mapped
            {lastRefreshed && ` · Refreshed ${lastRefreshed.toLocaleTimeString()}`}
          </p>
        </div>
        <button
          onClick={() => { setIsLoading(true); fetchData(); }}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-3 px-1">
        {Object.entries(statusColors).map(([status, color]) => (
          <span key={status} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded-full border border-gray-200">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            {status}: {statusCounts[status] || 0}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
          Office HQ
        </span>
      </div>

      {/* Map */}
      {isLoading ? (
        <div className="flex items-center justify-center h-96 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading map data…</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-96 bg-red-50 rounded-xl border border-red-200">
          <div className="text-center max-w-sm px-6">
            <div className="text-red-400 text-4xl mb-3">⚠️</div>
            <p className="text-red-700 font-medium">Map Unavailable</p>
            <p className="text-sm text-red-500 mt-1">{error}</p>
            <button onClick={fetchData} className="mt-3 text-sm text-red-600 underline">
              Try again
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Office not configured warning */}
          {officeNotConfigured && (
            <div className="flex items-start gap-3 rounded-xl border border-yellow-300 bg-yellow-50 p-4 mb-2">
              <span className="text-yellow-500 text-xl flex-shrink-0">📍</span>
              <div className="text-sm text-yellow-800">
                <span className="font-semibold">Office location not configured.</span>{' '}
                The map is showing a default location. Go to{' '}
                <a href="/settings" className="underline font-medium hover:text-yellow-900">
                  Settings → Geofence
                </a>{' '}
                and enter your office latitude, longitude, and radius to enable geofencing.
              </div>
            </div>
          )}
          <div style={{ height: '520px', width: '100%' }} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          <MapContainer
            center={defaultCenter}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <MapCenter center={defaultCenter} zoom={15} />
            
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Geofence circle */}
            {officeConfig?.officeLat && (
              <>
                <Circle
                  center={[officeConfig.officeLat, officeConfig.officeLng]}
                  radius={geofenceRadius}
                  pathOptions={{
                    color: '#3b82f6',
                    fillColor: '#93c5fd',
                    fillOpacity: 0.15,
                    weight: 2,
                    dashArray: '6, 4',
                  }}
                >
                  <Tooltip permanent direction="top" offset={[0, -10]}>
                    <span className="text-xs font-medium">Geofence: {geofenceRadius}m radius</span>
                  </Tooltip>
                </Circle>

                {/* Office marker */}
                <Marker position={[officeConfig.officeLat, officeConfig.officeLng]} icon={officeIcon}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold text-blue-700">🏢 Office HQ</p>
                      <p className="text-gray-500 text-xs mt-1">Geofence radius: {geofenceRadius}m</p>
                      <p className="text-gray-400 text-xs">
                        {officeConfig.officeLat.toFixed(5)}, {officeConfig.officeLng.toFixed(5)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}

            {/* Employee markers */}
            {records.map((record) => (
              <Marker
                key={record.id}
                position={[record.checkInLat, record.checkInLng]}
                icon={getEmployeeIcon(record.status)}
              >
                <Popup>
                  <div className="text-sm min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: statusColors[record.status] || '#6b7280' }}
                      />
                      <p className="font-semibold text-gray-800">{record.employeeName}</p>
                    </div>
                    <div className="space-y-1 text-gray-600">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Status</span>
                        <span className="text-xs font-medium">{record.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Check-in</span>
                        <span className="text-xs font-medium">{formatTime(record.checkIn)}</span>
                      </div>
                      {record.checkOut && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Check-out</span>
                          <span className="text-xs font-medium">{formatTime(record.checkOut)}</span>
                        </div>
                      )}
                      {record.workedHours != null && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Worked</span>
                          <span className="text-xs font-medium">{record.workedHours}h</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-gray-100 mt-1">
                        <span className="text-xs text-gray-400">
                          {record.checkInLat?.toFixed(5)}, {record.checkInLng?.toFixed(5)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        </>
      )}

      {/* No-location warning */}
      {!isLoading && !error && records.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-3">🗺️</div>
          <p className="font-medium">No location data for today</p>
          <p className="text-sm mt-1 text-gray-400">
            Employee check-ins with GPS coordinates will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
