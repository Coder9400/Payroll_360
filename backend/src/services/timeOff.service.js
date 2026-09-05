/**
 * Time Off Service — Phase 2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DURATION CALCULATION
 *   Duration is calculated from start_date to end_date by iterating each calendar
 *   day and checking if it is a working day per the employee's working_schedule.
 *   Non-working days (weekends/off-days) are excluded.
 *
 * ALLOCATION SELECTION STRATEGY: EARLIEST_EXPIRY_FIRST
 *   When multiple approved allocations exist for the same time_off_type,
 *   the allocation with the earliest valid_to date is consumed first.
 *   If valid_to is null (never-expiring), it is treated as last priority.
 *
 * BALANCE UPDATE — TRANSACTIONAL SAFETY
 *   Supabase PostgREST does not provide multi-table BEGIN/COMMIT syntax.
 *   We use optimistic concurrency control:
 *     - Fetch allocation with remaining_amount
 *     - Perform UPDATE with a WHERE remaining_amount >= required condition
 *     - If 0 rows updated → concurrent modification detected → throw error
 *   This prevents negative balances even under concurrent approvals.
 *
 * STATE MACHINE
 *   Request:   DRAFT → PENDING → APPROVED | REFUSED; APPROVED → CANCELLED
 *   Allocation: DRAFT → PENDING_APPROVAL → APPROVED | REFUSED; APPROVED → CANCELLED|EXPIRED
 *
 * OVERLAP DETECTION
 *   Before approving a request, check for existing APPROVED requests for the
 *   same employee that overlap the date range.
 *
 * BALANCE RESTORATION ON CANCELLATION
 *   When an APPROVED request is cancelled, taken_amount is decremented and
 *   remaining_amount is restored using the same optimistic locking pattern.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { supabaseAdmin, supabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const {
  ALLOCATION_STATUS,
  REQUEST_STATUS,
  VALID_REQUEST_TRANSITIONS,
  VALID_ALLOCATION_TRANSITIONS,
  TIME_OFF_UNIT,
  TIME_OFF_ERRORS,
} = require('../config/timeOffConstants');

const db = supabaseAdmin || supabase;

// ---------------------------------------------------------------------------
// PRIVATE HELPERS
// ---------------------------------------------------------------------------

/**
 * Get employee with their working schedule days.
 */
async function getEmployeeWithSchedule(employeeId) {
  const { data, error } = await db
    .from('employees')
    .select('*, working_schedules(*, working_schedule_days(*))')
    .eq('id', employeeId)
    .single();

  if (error || !data) {
    throw new AppError('Employee not found', 404, TIME_OFF_ERRORS.EMPLOYEE_NOT_FOUND);
  }
  return data;
}

/**
 * Check if a given date is a working day for an employee based on their schedule.
 * @param {Array} scheduleDays - working_schedule_days array
 * @param {Date} date
 * @returns {boolean}
 */
function isWorkingDay(scheduleDays, date) {
  const dayOfWeek = date.getDay(); // 0=Sunday ... 6=Saturday
  const sd = scheduleDays.find((d) => d.day_of_week === dayOfWeek);
  return sd ? sd.is_working_day === true : false;
}

/**
 * Calculate leave duration in working days (or hours for HOURS-unit leave).
 *
 * For DAYS unit: counts working days from start_date to end_date (inclusive).
 * For HOURS unit: duration is passed directly by caller (no day counting needed).
 *
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {Array} scheduleDays
 * @param {string} unit - 'DAYS' | 'HOURS'
 * @param {number} [hours] - For HOURS unit, the requested hours
 * @returns {number} duration
 */
function calculateDuration(startDate, endDate, scheduleDays, unit, hours) {
  if (unit === TIME_OFF_UNIT.HOURS) {
    if (!hours || hours <= 0) {
      throw new AppError('Duration in hours must be provided and positive for hourly leave', 400, 'BAD_REQUEST');
    }
    return hours;
  }

  // Count working days inclusive
  const start = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  let count = 0;

  const current = new Date(start);
  while (current <= end) {
    if (isWorkingDay(scheduleDays, current)) count++;
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Validate state transition for a request.
 */
function validateRequestTransition(currentStatus, newStatus) {
  const allowed = VALID_REQUEST_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      `Cannot transition from ${currentStatus} to ${newStatus}`,
      400,
      TIME_OFF_ERRORS.INVALID_STATE_TRANSITION
    );
  }
}

/**
 * Validate state transition for an allocation.
 */
function validateAllocationTransition(currentStatus, newStatus) {
  const allowed = VALID_ALLOCATION_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      `Cannot transition allocation from ${currentStatus} to ${newStatus}`,
      400,
      TIME_OFF_ERRORS.INVALID_STATE_TRANSITION
    );
  }
}

/**
 * Select the best allocation to consume for a request.
 * Strategy: EARLIEST_EXPIRY_FIRST (null valid_to = never-expiring = lowest priority).
 *
 * @param {Array} allocations - APPROVED allocations for the employee+type
 * @param {string} startDate - Request start date (YYYY-MM-DD)
 * @param {string} endDate - Request end date
 * @param {number} required - Required duration
 * @returns {object} Best allocation
 */
function selectAllocation(allocations, startDate, endDate, required) {
  // Filter: valid for the request period and has enough remaining balance
  const now = new Date();
  const start = new Date(startDate);

  const valid = allocations.filter((a) => {
    const validFrom = new Date(a.valid_from);
    const validTo = a.valid_to ? new Date(a.valid_to) : null;

    // Allocation must have started by request start
    if (validFrom > start) return false;

    // Allocation must not have expired before today or request start
    if (validTo && validTo < now) return false;

    // Must have sufficient remaining balance
    if (a.remaining_amount < required) return false;

    return true;
  });

  if (valid.length === 0) {
    return null;
  }

  // Sort by earliest valid_to (null = Infinity)
  valid.sort((a, b) => {
    const aTo = a.valid_to ? new Date(a.valid_to).getTime() : Infinity;
    const bTo = b.valid_to ? new Date(b.valid_to).getTime() : Infinity;
    return aTo - bTo;
  });

  return valid[0];
}

/**
 * Check for overlapping approved requests for the same employee.
 */
async function checkOverlap(employeeId, startDate, endDate, excludeRequestId = null) {
  let query = db
    .from('time_off_requests')
    .select('id, start_date, end_date, status')
    .eq('employee_id', employeeId)
    .eq('status', REQUEST_STATUS.APPROVED)
    .lte('start_date', endDate)
    .gte('end_date', startDate);

  if (excludeRequestId) {
    query = query.neq('id', excludeRequestId);
  }

  const { data, error } = await query;
  if (error) throw new AppError(error.message, 500);
  return data || [];
}

// ---------------------------------------------------------------------------
// ALLOCATION CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new time off allocation (HR only).
 */
async function createAllocation({ employee_id, time_off_type_id, allocated_amount, valid_from, valid_to, createdBy }) {
  // Verify employee exists
  const { data: emp, error: empErr } = await db
    .from('employees')
    .select('id')
    .eq('id', employee_id)
    .single();

  if (empErr || !emp) {
    throw new AppError('Employee not found', 404, TIME_OFF_ERRORS.EMPLOYEE_NOT_FOUND);
  }

  // Verify time off type exists and is active
  const { data: tot, error: totErr } = await db
    .from('time_off_types')
    .select('id, name, unit, requires_allocation, is_active')
    .eq('id', time_off_type_id)
    .single();

  if (totErr || !tot) {
    throw new AppError('Time off type not found', 404, TIME_OFF_ERRORS.TYPE_NOT_FOUND);
  }
  if (!tot.is_active) {
    throw new AppError('Time off type is not active', 400, TIME_OFF_ERRORS.TYPE_NOT_FOUND);
  }

  const { data, error } = await db
    .from('time_off_allocations')
    .insert([{
      employee_id,
      time_off_type_id,
      allocated_amount,
      approved_amount: 0,
      taken_amount: 0,
      remaining_amount: 0,
      valid_from,
      valid_to: valid_to || null,
      status: ALLOCATION_STATUS.DRAFT,
      created_by: createdBy,
    }])
    .select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit)')
    .single();

  if (error) throw new AppError(error.message, 500);
  return data;
}

/**
 * Get allocations with filters.
 */
async function getAllocations(filters = {}) {
  const { page = 1, limit = 20, employee_id, time_off_type_id, status } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('time_off_allocations')
    .select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit, requires_allocation)', { count: 'exact' });

  if (employee_id) query = query.eq('employee_id', employee_id);
  if (time_off_type_id) query = query.eq('time_off_type_id', time_off_type_id);
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query
    .range(offset, offset + Number(limit) - 1)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(error.message, 500);

  return { data, page: Number(page), limit: Number(limit), total: count, totalPages: Math.ceil(count / limit) };
}

/**
 * Get allocation by ID.
 */
async function getAllocationById(id) {
  const { data, error } = await db
    .from('time_off_allocations')
    .select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit, requires_allocation)')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError('Allocation not found', 404, TIME_OFF_ERRORS.ALLOCATION_NOT_FOUND);
  }
  return data;
}

/**
 * Update allocation (HR only, only in DRAFT/PENDING status).
 */
async function updateAllocation(id, updates) {
  const existing = await getAllocationById(id);

  if (![ALLOCATION_STATUS.DRAFT, ALLOCATION_STATUS.PENDING_APPROVAL].includes(existing.status)) {
    throw new AppError(
      'Cannot update allocation that is not in DRAFT or PENDING_APPROVAL status',
      400,
      TIME_OFF_ERRORS.INVALID_STATE_TRANSITION
    );
  }

  const { data, error } = await db
    .from('time_off_allocations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit)')
    .single();

  if (error) throw new AppError(error.message, 500);
  return data;
}

/**
 * Approve an allocation.
 * Sets approved_amount = allocated_amount and remaining_amount = allocated_amount.
 */
async function approveAllocation(id, approverId) {
  const existing = await getAllocationById(id);
  validateAllocationTransition(existing.status, ALLOCATION_STATUS.APPROVED);

  // Prevent self-approval
  const { data: approverEmployee } = await db
    .from('employees')
    .select('id')
    .eq('user_id', approverId)
    .single();

  if (approverEmployee && approverEmployee.id === existing.employee_id) {
    throw new AppError(
      'You cannot approve your own allocation',
      403,
      TIME_OFF_ERRORS.SELF_APPROVAL
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await db
    .from('time_off_allocations')
    .update({
      status: ALLOCATION_STATUS.APPROVED,
      approved_amount: existing.allocated_amount,
      remaining_amount: existing.allocated_amount,
      approved_by: approverId,
      approved_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit)')
    .single();

  if (error) throw new AppError(error.message, 500);
  return data;
}

/**
 * Refuse an allocation.
 */
async function refuseAllocation(id, approverId, refusal_reason) {
  const existing = await getAllocationById(id);
  validateAllocationTransition(existing.status, ALLOCATION_STATUS.REFUSED);

  const now = new Date().toISOString();
  const { data, error } = await db
    .from('time_off_allocations')
    .update({
      status: ALLOCATION_STATUS.REFUSED,
      approved_by: approverId,
      approved_at: now,
      refusal_reason: refusal_reason || null,
      updated_at: now,
    })
    .eq('id', id)
    .select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit)')
    .single();

  if (error) throw new AppError(error.message, 500);
  return data;
}

/**
 * Delete (cancel) an allocation.
 */
async function deleteAllocation(id) {
  const existing = await getAllocationById(id);

  if (existing.status === ALLOCATION_STATUS.APPROVED && existing.taken_amount > 0) {
    throw new AppError(
      'Cannot delete an approved allocation that has already been consumed by requests',
      409,
      TIME_OFF_ERRORS.INVALID_STATE_TRANSITION
    );
  }

  const { error } = await db
    .from('time_off_allocations')
    .delete()
    .eq('id', id);

  if (error) throw new AppError(error.message, 500);
  return { id };
}

// ---------------------------------------------------------------------------
// REQUEST CRUD
// ---------------------------------------------------------------------------

/**
 * Create a time off request.
 *
 * Duration is always calculated by the backend.
 * For HOURS type: requester must pass hours in the body (captured as `duration_hours`).
 */
async function createRequest({ employee_id, time_off_type_id, start_date, end_date, reason, duration_hours, submittedBy }) {
  // Verify employee
  const employee = await getEmployeeWithSchedule(employee_id);
  const scheduleDays = employee.working_schedules?.working_schedule_days || [];

  // Verify time off type
  const { data: tot, error: totErr } = await db
    .from('time_off_types')
    .select('*')
    .eq('id', time_off_type_id)
    .single();

  if (totErr || !tot) {
    throw new AppError('Time off type not found', 404, TIME_OFF_ERRORS.TYPE_NOT_FOUND);
  }
  if (!tot.is_active) {
    throw new AppError('Time off type is not active', 400, TIME_OFF_ERRORS.TYPE_NOT_FOUND);
  }

  // Calculate duration
  const duration = calculateDuration(start_date, end_date, scheduleDays, tot.unit, duration_hours);

  if (duration <= 0) {
    throw new AppError(
      'The requested period contains no working days according to your schedule',
      400,
      'BAD_REQUEST'
    );
  }

  // Determine initial status based on requires_approval
  const initialStatus = tot.requires_approval ? REQUEST_STATUS.PENDING : REQUEST_STATUS.APPROVED;

  const { data, error } = await db
    .from('time_off_requests')
    .insert([{
      employee_id,
      time_off_type_id,
      start_date,
      end_date,
      duration,
      unit: tot.unit,
      reason: reason || null,
      status: initialStatus,
    }])
    .select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit, requires_allocation, requires_approval)')
    .single();

  if (error) throw new AppError(error.message, 500);

  // If auto-approved (requires_approval = false), consume balance now
  if (initialStatus === REQUEST_STATUS.APPROVED && tot.requires_allocation) {
    await consumeAllocationBalance(employee_id, time_off_type_id, start_date, end_date, duration, data.id, submittedBy);
  }

  return data;
}

/**
 * Get requests with filters.
 */
async function getRequests(filters = {}) {
  const { page = 1, limit = 20, employee_id, time_off_type_id, status, date_from, date_to } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('time_off_requests')
    .select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit)', { count: 'exact' });

  if (employee_id) query = query.eq('employee_id', employee_id);
  if (time_off_type_id) query = query.eq('time_off_type_id', time_off_type_id);
  if (status) query = query.eq('status', status);
  if (date_from) query = query.gte('start_date', date_from);
  if (date_to) query = query.lte('end_date', date_to);

  const { data, error, count } = await query
    .range(offset, offset + Number(limit) - 1)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(error.message, 500);
  return { data, page: Number(page), limit: Number(limit), total: count, totalPages: Math.ceil(count / limit) };
}

/**
 * Get request by ID.
 */
async function getRequestById(id) {
  const { data, error } = await db
    .from('time_off_requests')
    .select('*, employees(first_name, last_name, employee_code), time_off_types(*)')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError('Time off request not found', 404, TIME_OFF_ERRORS.REQUEST_NOT_FOUND);
  }
  return data;
}

/**
 * Update a request (only while in DRAFT status).
 */
async function updateRequest(id, updates, employeeId) {
  const existing = await getRequestById(id);

  if (existing.status !== REQUEST_STATUS.DRAFT) {
    throw new AppError(
      'Only DRAFT requests can be updated',
      400,
      TIME_OFF_ERRORS.INVALID_STATE_TRANSITION
    );
  }

  // Recalculate duration if dates changed
  let newData = { ...updates };
  if (updates.start_date || updates.end_date) {
    const employee = await getEmployeeWithSchedule(existing.employee_id);
    const scheduleDays = employee.working_schedules?.working_schedule_days || [];
    const startDate = updates.start_date || existing.start_date;
    const endDate = updates.end_date || existing.end_date;
    newData.duration = calculateDuration(startDate, endDate, scheduleDays, existing.unit);
  }

  const { data, error } = await db
    .from('time_off_requests')
    .update({ ...newData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit)')
    .single();

  if (error) throw new AppError(error.message, 500);
  return data;
}

/**
 * Consume allocation balance when a request is approved.
 * Uses optimistic concurrency: updates only if remaining_amount >= required.
 *
 * @param {string} employeeId
 * @param {string} timeOffTypeId
 * @param {string} startDate
 * @param {string} endDate
 * @param {number} required - Duration to consume
 * @param {string} requestId
 * @param {string} approverId
 */
async function consumeAllocationBalance(employeeId, timeOffTypeId, startDate, endDate, required, requestId, approverId) {
  // Fetch all APPROVED allocations for this employee/type
  const { data: allocations, error: allocErr } = await db
    .from('time_off_allocations')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('time_off_type_id', timeOffTypeId)
    .eq('status', ALLOCATION_STATUS.APPROVED)
    .order('valid_to', { ascending: true, nullsFirst: false });

  if (allocErr) throw new AppError(allocErr.message, 500);

  const allocation = selectAllocation(allocations || [], startDate, endDate, required);

  if (!allocation) {
    throw new AppError(
      'Insufficient time off balance or no valid allocation found for the requested period',
      422,
      TIME_OFF_ERRORS.INSUFFICIENT_BALANCE
    );
  }

  // Optimistic locking: update only if remaining_amount >= required
  const { data: updated, error: updateErr } = await db
    .from('time_off_allocations')
    .update({
      taken_amount: allocation.taken_amount + required,
      remaining_amount: allocation.remaining_amount - required,
      updated_at: new Date().toISOString(),
    })
    .eq('id', allocation.id)
    .gte('remaining_amount', required) // CRITICAL: prevents race condition
    .select('id, remaining_amount, taken_amount');

  if (updateErr) throw new AppError(updateErr.message, 500);

  // If no rows updated, another concurrent approval consumed the balance
  if (!updated || updated.length === 0) {
    throw new AppError(
      'Insufficient time off balance. Another request may have consumed the remaining allocation.',
      422,
      TIME_OFF_ERRORS.INSUFFICIENT_BALANCE
    );
  }

  return updated[0];
}

/**
 * Restore allocation balance when an approved request is cancelled.
 */
async function restoreAllocationBalance(employeeId, timeOffTypeId, amount, approverId) {
  // Find the allocation that was most likely consumed (taken_amount > 0, earliest expiry first)
  const { data: allocations, error: allocErr } = await db
    .from('time_off_allocations')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('time_off_type_id', timeOffTypeId)
    .eq('status', ALLOCATION_STATUS.APPROVED)
    .gt('taken_amount', 0)
    .order('valid_to', { ascending: true, nullsFirst: false });

  if (allocErr) throw new AppError(allocErr.message, 500);

  if (!allocations || allocations.length === 0) {
    // No allocation to restore to — possibly type doesn't require allocation
    return null;
  }

  const allocation = allocations[0];
  const restoreAmount = Math.min(amount, allocation.taken_amount); // safety: never restore more than taken

  const { error } = await db
    .from('time_off_allocations')
    .update({
      taken_amount: allocation.taken_amount - restoreAmount,
      remaining_amount: allocation.remaining_amount + restoreAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', allocation.id)
    .gte('taken_amount', restoreAmount); // Safety check

  if (error) throw new AppError(error.message, 500);

  return { restored: restoreAmount };
}

/**
 * Approve a time off request.
 * - Validates state transition
 * - Checks overlap with other approved requests
 * - Consumes allocation balance (if type requires_allocation)
 * - Uses optimistic concurrency to prevent race conditions
 */
async function approveRequest(id, approverId) {
  const existing = await getRequestById(id);
  validateRequestTransition(existing.status, REQUEST_STATUS.APPROVED);

  // Prevent self-approval
  const { data: approverEmployee } = await db
    .from('employees')
    .select('id')
    .eq('user_id', approverId)
    .single();

  if (approverEmployee && approverEmployee.id === existing.employee_id) {
    throw new AppError(
      'You cannot approve your own time off request',
      403,
      TIME_OFF_ERRORS.SELF_APPROVAL
    );
  }

  // Check overlap with already approved requests
  const overlapping = await checkOverlap(existing.employee_id, existing.start_date, existing.end_date, id);
  if (overlapping.length > 0) {
    throw new AppError(
      `Time off request overlaps with an existing approved request (${overlapping[0].start_date} to ${overlapping[0].end_date})`,
      409,
      TIME_OFF_ERRORS.REQUEST_OVERLAP
    );
  }

  const tot = existing.time_off_types;
  const now = new Date().toISOString();

  // Consume allocation balance if required
  if (tot.requires_allocation) {
    await consumeAllocationBalance(
      existing.employee_id,
      existing.time_off_type_id,
      existing.start_date,
      existing.end_date,
      existing.duration,
      id,
      approverId
    );
  }

  // Update request status
  const { data, error } = await db
    .from('time_off_requests')
    .update({
      status: REQUEST_STATUS.APPROVED,
      approved_by: approverId,
      approved_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit, requires_allocation)')
    .single();

  if (error) throw new AppError(error.message, 500);
  return data;
}

/**
 * Refuse a time off request.
 */
async function refuseRequest(id, approverId, refusal_reason) {
  const existing = await getRequestById(id);
  validateRequestTransition(existing.status, REQUEST_STATUS.REFUSED);

  const now = new Date().toISOString();
  const { data, error } = await db
    .from('time_off_requests')
    .update({
      status: REQUEST_STATUS.REFUSED,
      approved_by: approverId,
      approved_at: now,
      refusal_reason: refusal_reason || null,
      updated_at: now,
    })
    .eq('id', id)
    .select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit)')
    .single();

  if (error) throw new AppError(error.message, 500);
  return data;
}

/**
 * Cancel a time off request.
 * If the request was APPROVED, restore the allocation balance.
 */
async function cancelRequest(id, cancelledBy) {
  const existing = await getRequestById(id);
  validateRequestTransition(existing.status, REQUEST_STATUS.CANCELLED);

  const wasApproved = existing.status === REQUEST_STATUS.APPROVED;
  const now = new Date().toISOString();

  // Update request first
  const { data, error } = await db
    .from('time_off_requests')
    .update({
      status: REQUEST_STATUS.CANCELLED,
      updated_at: now,
    })
    .eq('id', id)
    .select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit, requires_allocation)')
    .single();

  if (error) throw new AppError(error.message, 500);

  // Restore allocation balance if this was an approved request
  if (wasApproved && existing.time_off_types?.requires_allocation) {
    await restoreAllocationBalance(
      existing.employee_id,
      existing.time_off_type_id,
      existing.duration,
      cancelledBy
    );
  }

  return data;
}

/**
 * Delete a request (only DRAFT or CANCELLED).
 */
async function deleteRequest(id) {
  const existing = await getRequestById(id);

  if (![REQUEST_STATUS.DRAFT, REQUEST_STATUS.CANCELLED].includes(existing.status)) {
    throw new AppError(
      'Only DRAFT or CANCELLED requests can be deleted',
      400,
      TIME_OFF_ERRORS.INVALID_STATE_TRANSITION
    );
  }

  const { error } = await db
    .from('time_off_requests')
    .delete()
    .eq('id', id);

  if (error) throw new AppError(error.message, 500);
  return { id };
}

/**
 * Get employee time off balance.
 * Returns all approved allocations with remaining balance for an employee.
 */
async function getEmployeeBalances(employeeId) {
  const { data, error } = await db
    .from('time_off_allocations')
    .select('*, time_off_types(name, unit, code)')
    .eq('employee_id', employeeId)
    .eq('status', ALLOCATION_STATUS.APPROVED)
    .order('valid_to', { ascending: true, nullsFirst: false });

  if (error) throw new AppError(error.message, 500);

  // Group by time_off_type for a summary view
  const balanceMap = {};
  for (const alloc of (data || [])) {
    const typeId = alloc.time_off_type_id;
    if (!balanceMap[typeId]) {
      balanceMap[typeId] = {
        time_off_type_id: typeId,
        time_off_type: alloc.time_off_types,
        total_allocated: 0,
        total_approved: 0,
        total_taken: 0,
        total_remaining: 0,
        allocations: [],
      };
    }
    balanceMap[typeId].total_allocated += parseFloat(alloc.allocated_amount);
    balanceMap[typeId].total_approved += parseFloat(alloc.approved_amount);
    balanceMap[typeId].total_taken += parseFloat(alloc.taken_amount);
    balanceMap[typeId].total_remaining += parseFloat(alloc.remaining_amount);
    balanceMap[typeId].allocations.push(alloc);
  }

  return Object.values(balanceMap);
}

/**
 * Get time off types (re-exported from Phase 1 table).
 */
async function getTimeOffTypes(filters = {}) {
  const { is_active } = filters;
  let query = db.from('time_off_types').select('*').order('name');
  if (is_active !== undefined) query = query.eq('is_active', is_active);
  const { data, error } = await query;
  if (error) throw new AppError(error.message, 500);
  return data;
}

/**
 * Check if a given date has an approved leave for an employee.
 * Used by Attendance/absence calculation.
 */
async function hasApprovedLeaveOnDate(employeeId, date) {
  const { data, error } = await db
    .from('time_off_requests')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('status', REQUEST_STATUS.APPROVED)
    .lte('start_date', date)
    .gte('end_date', date)
    .limit(1);

  if (error) return false;
  return data && data.length > 0;
}

module.exports = {
  // Allocation
  createAllocation,
  getAllocations,
  getAllocationById,
  updateAllocation,
  approveAllocation,
  refuseAllocation,
  deleteAllocation,
  // Requests
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  approveRequest,
  refuseRequest,
  cancelRequest,
  deleteRequest,
  // Balance
  getEmployeeBalances,
  // Types
  getTimeOffTypes,
  // Utils
  hasApprovedLeaveOnDate,
  calculateDuration,
  isWorkingDay,
  selectAllocation,
};
