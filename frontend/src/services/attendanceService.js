/**
 * Attendance Service
 * ──────────────────
 * Real API calls to the PeoplePay360 backend.
 * All data persists in Supabase PostgreSQL.
 */

import api from './api';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

// List endpoints return a flat array under `data`; some nest it under a named key instead.
function unwrapList(payload, key) {
  return Array.isArray(payload) ? payload : (payload?.[key] ?? payload?.data ?? []);
}

// Map backend attendance record → frontend format
function mapRecord(r) {
  if (!r) return null;
  const emp = r.employees ?? r.employee ?? {};
  const empName = emp.first_name
    ? `${emp.first_name} ${emp.last_name}`
    : (r.employee_name ?? '');
  return {
    id:             r.id,
    employeeId:     r.employee_id,
    employeeName:   empName,
    department:     emp.department?.name ?? '',
    date:           r.attendance_date,
    checkIn:        r.check_in,
    checkInLat:     r.check_in_lat,
    checkInLng:     r.check_in_lng,
    checkOut:       r.check_out,
    checkOutLat:    r.check_out_lat,
    checkOutLng:    r.check_out_lng,
    workedHours:    r.worked_hours ?? null,
    scheduledHours: r.expected_hours ?? 8,
    overtime:       r.overtime_hours ?? null,
    status:         mapStatus(r.status),
    isManualEdit:   r.is_manual_edit,
    correctionReason: r.correction_reason,
    notes:          r.notes,
  };
}

// Backend status → frontend display
function mapStatus(s) {
  const map = {
    PRESENT:         'Present',
    LATE:            'Late',
    HALF_DAY:        'Half Day',
    OVERTIME:        'Overtime',
    MISSING_CHECKOUT:'Missing Checkout',
    CORRECTED:       'Corrected',
  };
  return map[s] ?? s;
}

export const attendanceService = {
  /**
   * Get all attendance records (HR view)
   */
  async getAttendance(params = {}) {
    const query = new URLSearchParams();
    if (params.page)        query.set('page', params.page ?? 1);
    if (params.limit)       query.set('limit', params.limit ?? 50);
    if (params.search)      query.set('search', params.search);
    if (params.date_from)   query.set('date_from', params.date_from);
    if (params.date_to)     query.set('date_to', params.date_to);
    if (params.status && params.status !== 'All Statuses') {
      // Convert display status back to backend status
      const reverseMap = {
        'Present': 'PRESENT', 'Late': 'LATE', 'Half Day': 'HALF_DAY',
        'Overtime': 'OVERTIME', 'Missing Checkout': 'MISSING_CHECKOUT', 'Corrected': 'CORRECTED',
      };
      query.set('status', reverseMap[params.status] ?? params.status);
    }
    if (params.employee_id) query.set('employee_id', params.employee_id);

    const response = await api.get(`/attendance?${query.toString()}`);
    const payload  = unwrap(response);
    const records  = unwrapList(payload, 'attendance').map(mapRecord);

    // Build summary metrics from returned data
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter(r => r.date === today);

    return {
      data: records,
      meta: payload.pagination ?? {},
      metrics: {
        presentToday:    todayRecords.filter(r => ['Present','Late','Overtime'].includes(r.status)).length,
        absentToday:     0, // Absence is derived — not stored as records
        lateToday:       todayRecords.filter(r => r.status === 'Late').length,
        missingCheckout: records.filter(r => r.status === 'Missing Checkout').length,
      },
    };
  },

  /**
   * Get attendance records for a specific employee
   */
  async getEmployeeAttendance(employeeId, params = {}) {
    const query = new URLSearchParams();
    if (params.page)      query.set('page', params.page ?? 1);
    if (params.limit)     query.set('limit', params.limit ?? 50);
    if (params.date_from) query.set('date_from', params.date_from);
    if (params.date_to)   query.set('date_to', params.date_to);

    const response = await api.get(`/employees/${employeeId}/attendance?${query.toString()}`);
    const payload  = unwrap(response);
    const records  = unwrapList(payload, 'attendance').map(mapRecord);

    const presentDays    = records.filter(r => ['Present','Late','Overtime'].includes(r.status)).length;
    const leaveDays      = 0; // Not stored in attendance table
    const totalWorkedHours = records.reduce((acc, r) => acc + (r.workedHours ?? 0), 0);

    return {
      data: records,
      meta: payload.pagination ?? {},
      metrics: { presentDays, absentDays: 0, leaveDays, totalWorkedHours },
    };
  },

  /**
   * Get today's attendance for the current employee (self-service)
   */
  async getMyTodayAttendance(employeeId) {
    const today = new Date().toISOString().split('T')[0];
    try {
      const response = await api.get(
        `/employees/${employeeId}/attendance?date_from=${today}&date_to=${today}&limit=1`
      );
      const payload = unwrap(response);
      const records = unwrapList(payload, 'attendance').map(mapRecord);
      return records[0] ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Check In
   */
  async checkIn(employeeId, notes, lat, lng) {
    const payload = {};
    if (notes) payload.notes = notes;
    if (lat) payload.lat = lat;
    if (lng) payload.lng = lng;
    const response = await api.post('/attendance/check-in', payload);
    return mapRecord(unwrap(response));
  },

  /**
   * Check Out
   */
  async checkOut(employeeId, notes, lat, lng) {
    const payload = {};
    if (notes) payload.notes = notes;
    if (lat) payload.lat = lat;
    if (lng) payload.lng = lng;
    const response = await api.post('/attendance/check-out', payload);
    return mapRecord(unwrap(response));
  },

  /**
   * Correct an attendance record (HR only)
   */
  async correctAttendance(id, data) {
    const payload = {
      check_in:          data.checkIn ?? data.check_in,
      check_out:         data.checkOut ?? data.check_out,
      correction_reason: data.reason ?? data.correction_reason,
      notes:             data.notes,
    };
    const response = await api.put(`/attendance/${id}`, payload);
    return mapRecord(unwrap(response));
  },

  /**
   * Get regularization requests (maps to attendance corrections)
   */
  async getRegularizationRequests(params = {}) {
    // Regularization is managed as attendance corrections in our backend
    // For now, return attendance records with MISSING_CHECKOUT as pending regularizations
    const response = await this.getAttendance({ ...params, limit: 100 });
    return response.data.filter(r => r.status === 'Missing Checkout');
  },

  /**
   * Create regularization request (submit corrected times)
   */
  async createRegularization(data) {
    return this.correctAttendance(data.attendanceId, {
      checkIn:  data.requestedCheckIn,
      checkOut: data.requestedCheckOut,
      reason:   data.reason,
    });
  },

  /**
   * Approve regularization (already corrected via correctAttendance)
   */
  async approveRegularization(id) {
    return this.correctAttendance(id, { correction_reason: 'Approved by manager' });
  },

  /**
   * Reject regularization
   */
  async rejectRegularization(id, reason) {
    return this.correctAttendance(id, { correction_reason: `Rejected: ${reason}` });
  },
};
