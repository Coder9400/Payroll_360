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
 *
 * MULTI-TENANCY
 *   Every function takes tenantId as its first argument and filters/tags every
 *   query via withTenant()/withTenantId() — see backend/src/utils/tenantScope.js.
 *
 * LEAVE ROUTING
 *   time_off_requests.recipient_user_id records who a request was addressed to
 *   (defaults to the employee's manager). HR/Admin can always act as a
 *   fallback regardless of this value — enforced in the controller, not here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { supabaseAdmin, supabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const { withTenant, withTenantId } = require('../utils/tenantScope');
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
async function getEmployeeWithSchedule(tenantId, employeeId) {
  const { data, error } = await withTenant(
    db.from('employees').select('*, working_schedules(*, working_schedule_days(*))').eq('id', employeeId),
    tenantId
  ).single();

  if (error || !data) {
    throw new AppError('Employee not found', 404, TIME_OFF_ERRORS.EMPLOYEE_NOT_FOUND);
  }
  return data;
}

/**
 * Resolve the default recipient for a new request: the employee's manager's
 * linked user account, falling back to null (HR/Admin catch-all queue only)
 * if the employee has no manager or the manager has no login yet.
 */
async function resolveDefaultRecipient(tenantId, employee) {
  if (!employee.manager_id) return null;
  const { data: manager } = await withTenant(
    db.from('employees').select('user_id').eq('id', employee.manager_id),
    tenantId
  ).maybeSingle();
  return manager?.user_id || null;
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
async function checkOverlap(tenantId, employeeId, startDate, endDate, excludeRequestId = null) {
  let query = withTenant(
    db.from('time_off_requests')
      .select('id, start_date, end_date, status')
      .eq('employee_id', employeeId)
      .eq('status', REQUEST_STATUS.APPROVED)
      .lte('start_date', endDate)
      .gte('end_date', startDate),
    tenantId
  );

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
async function createAllocation(tenantId, { employee_id, time_off_type_id, allocated_amount, valid_from, valid_to, createdBy }) {
  // Verify employee exists
  const { data: emp, error: empErr } = await withTenant(
    db.from('employees').select('id').eq('id', employee_id),
    tenantId
  ).single();

  if (empErr || !emp) {
    throw new AppError('Employee not found', 404, TIME_OFF_ERRORS.EMPLOYEE_NOT_FOUND);
  }

  // Verify time off type exists and is active
  const { data: tot, error: totErr } = await withTenant(
    db.from('time_off_types').select('id, name, unit, requires_allocation, is_active').eq('id', time_off_type_id),
    tenantId
  ).single();

  if (totErr || !tot) {
    throw new AppError('Time off type not found', 404, TIME_OFF_ERRORS.TYPE_NOT_FOUND);
  }
  if (!tot.is_active) {
    throw new AppError('Time off type is not active', 400, TIME_OFF_ERRORS.TYPE_NOT_FOUND);
  }

  const payload = withTenantId({
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
  }, tenantId);

  const { data, error } = await db
    .from('time_off_allocations')
    .insert([payload])
    .select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit)')
    .single();

  if (error) throw new AppError(error.message, 500);
  return data;
}

/**
 * Get allocations with filters.
 */
async function getAllocations(tenantId, filters = {}) {
  const { page = 1, limit = 20, employee_id, time_off_type_id, status } = filters;
  const offset = (page - 1) * limit;

  let query = withTenant(
    db.from('time_off_allocations').select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit, requires_allocation)', { count: 'exact' }),
    tenantId
  );

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
async function getAllocationById(tenantId, id) {
  const { data, error } = await withTenant(
    db.from('time_off_allocations').select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit, requires_allocation)').eq('id', id),
    tenantId
  ).single();

  if (error || !data) {
    throw new AppError('Allocation not found', 404, TIME_OFF_ERRORS.ALLOCATION_NOT_FOUND);
  }
  return data;
}

/**
 * Update allocation (HR only, only in DRAFT/PENDING status).
 */
async function updateAllocation(tenantId, id, updates) {
  const existing = await getAllocationById(tenantId, id);

  if (![ALLOCATION_STATUS.DRAFT, ALLOCATION_STATUS.PENDING_APPROVAL].includes(existing.status)) {
    throw new AppError(
      'Cannot update allocation that is not in DRAFT or PENDING_APPROVAL status',
      400,
      TIME_OFF_ERRORS.INVALID_STATE_TRANSITION
    );
  }

  const { tenant_id, ...safeUpdates } = updates || {};
  const { data, error } = await db
    .from('time_off_allocations')
    .update({ ...safeUpdates, updated_at: new Date().toISOString() })
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
async function approveAllocation(tenantId, id, approverId) {
  const existing = await getAllocationById(tenantId, id);
  validateAllocationTransition(existing.status, ALLOCATION_STATUS.APPROVED);

  // Prevent self-approval
  const { data: approverEmployee } = await withTenant(
    db.from('employees').select('id').eq('user_id', approverId),
    tenantId
  ).maybeSingle();

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
async function refuseAllocation(tenantId, id, approverId, refusal_reason) {
  const existing = await getAllocationById(tenantId, id);
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
async function deleteAllocation(tenantId, id) {
  const existing = await getAllocationById(tenantId, id);

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
 * Duration is always calculated by the backend. If recipientUserId is not
 * explicitly supplied, defaults to the employee's manager (see
 * resolveDefaultRecipient) — null if the employee has no manager, in which
 * case only the HR/Admin catch-all queue will see it.
 *
 * For HOURS type: requester must pass hours in the body (captured as `duration_hours`).
 */
async function createRequest(tenantId, { employee_id, time_off_type_id, start_date, end_date, reason, duration_hours, recipient_user_id, submittedBy }) {
  // Verify employee
  const employee = await getEmployeeWithSchedule(tenantId, employee_id);
  const scheduleDays = employee.working_schedules?.working_schedule_days || [];

  // Verify time off type
  const { data: tot, error: totErr } = await withTenant(
    db.from('time_off_types').select('*').eq('id', time_off_type_id),
    tenantId
  ).single();

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

  // Resolve who this request is addressed to
  const recipientUserId = recipient_user_id || await resolveDefaultRecipient(tenantId, employee);

  const payload = withTenantId({
    employee_id,
    time_off_type_id,
    start_date,
    end_date,
    duration,
    unit: tot.unit,
    reason: reason || null,
    status: initialStatus,
    recipient_user_id: recipientUserId,
  }, tenantId);

  const { data, error } = await db
    .from('time_off_requests')
    .insert([payload])
    .select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit, requires_allocation, requires_approval)')
    .single();

  if (error) throw new AppError(error.message, 500);

  // If auto-approved (requires_approval = false), consume balance now
  if (initialStatus === REQUEST_STATUS.APPROVED && tot.requires_allocation) {
    await consumeAllocationBalance(tenantId, employee_id, time_off_type_id, start_date, end_date, duration, data.id, submittedBy);
  }

  return data;
}

/**
 * Get requests with filters. Pass `recipient_user_id` to scope to a single
 * manager's personal approval inbox (used by the "sent to me" queue).
 */
async function getRequests(tenantId, filters = {}) {
  const { page = 1, limit = 20, employee_id, time_off_type_id, status, date_from, date_to, recipient_user_id } = filters;
  const offset = (page - 1) * limit;

  let query = withTenant(
    db.from('time_off_requests').select('*, employees(first_name, last_name, employee_code), time_off_types(name, unit)', { count: 'exact' }),
    tenantId
  );

  if (employee_id) query = query.eq('employee_id', employee_id);
  if (time_off_type_id) query = query.eq('time_off_type_id', time_off_type_id);
  if (status) query = query.eq('status', status);
  if (date_from) query = query.gte('start_date', date_from);
  if (date_to) query = query.lte('end_date', date_to);
  if (recipient_user_id) query = query.eq('recipient_user_id', recipient_user_id);

  const { data, error, count } = await query
    .range(offset, offset + Number(limit) - 1)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(error.message, 500);
  return { data, page: Number(page), limit: Number(limit), total: count, totalPages: Math.ceil(count / limit) };
}

/**
 * Get request by ID.
 */
async function getRequestById(tenantId, id) {
  const { data, error } = await withTenant(
    db.from('time_off_requests').select('*, employees(first_name, last_name, employee_code), time_off_types(*)').eq('id', id),
    tenantId
  ).single();

  if (error || !data) {
    throw new AppError('Time off request not found', 404, TIME_OFF_ERRORS.REQUEST_NOT_FOUND);
  }
  return data;
}

/**
 * Update a request (only while in DRAFT status).
 */
async function updateRequest(tenantId, id, updates, employeeId) {
  const existing = await getRequestById(tenantId, id);

  if (existing.status !== REQUEST_STATUS.DRAFT) {
    throw new AppError(
      'Only DRAFT requests can be updated',
      400,
      TIME_OFF_ERRORS.INVALID_STATE_TRANSITION
    );
  }

  // Recalculate duration if dates changed
  const { tenant_id, ...safeUpdates } = updates || {};
  let newData = { ...safeUpdates };
  if (updates.start_date || updates.end_date) {
    const employee = await getEmployeeWithSchedule(tenantId, existing.employee_id);
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
 */
async function consumeAllocationBalance(tenantId, employeeId, timeOffTypeId, startDate, endDate, required, requestId, approverId) {
  // Fetch all APPROVED allocations for this employee/type
  const { data: allocations, error: allocErr } = await withTenant(
    db.from('time_off_allocations')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('time_off_type_id', timeOffTypeId)
      .eq('status', ALLOCATION_STATUS.APPROVED),
    tenantId
  ).order('valid_to', { ascending: true, nullsFirst: false });

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
async function restoreAllocationBalance(tenantId, employeeId, timeOffTypeId, amount, approverId) {
  // Find the allocation that was most likely consumed (taken_amount > 0, earliest expiry first)
  const { data: allocations, error: allocErr } = await withTenant(
    db.from('time_off_allocations')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('time_off_type_id', timeOffTypeId)
      .eq('status', ALLOCATION_STATUS.APPROVED)
      .gt('taken_amount', 0),
    tenantId
  ).order('valid_to', { ascending: true, nullsFirst: false });

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
async function approveRequest(tenantId, id, approverId) {
  const existing = await getRequestById(tenantId, id);
  validateRequestTransition(existing.status, REQUEST_STATUS.APPROVED);

  // Prevent self-approval
  const { data: approverEmployee } = await withTenant(
    db.from('employees').select('id').eq('user_id', approverId),
    tenantId
  ).maybeSingle();

  if (approverEmployee && approverEmployee.id === existing.employee_id) {
    throw new AppError(
      'You cannot approve your own time off request',
      403,
      TIME_OFF_ERRORS.SELF_APPROVAL
    );
  }

  // Check overlap with already approved requests
  const overlapping = await checkOverlap(tenantId, existing.employee_id, existing.start_date, existing.end_date, id);
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
      tenantId,
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
async function refuseRequest(tenantId, id, approverId, refusal_reason) {
  const existing = await getRequestById(tenantId, id);
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
async function cancelRequest(tenantId, id, cancelledBy) {
  const existing = await getRequestById(tenantId, id);
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
      tenantId,
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
async function deleteRequest(tenantId, id) {
  const existing = await getRequestById(tenantId, id);

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
async function getEmployeeBalances(tenantId, employeeId) {
  const { data, error } = await withTenant(
    db.from('time_off_allocations')
      .select('*, time_off_types(name, unit, code)')
      .eq('employee_id', employeeId)
      .eq('status', ALLOCATION_STATUS.APPROVED),
    tenantId
  ).order('valid_to', { ascending: true, nullsFirst: false });

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
async function getTimeOffTypes(tenantId, filters = {}) {
  const { is_active } = filters;
  let query = withTenant(db.from('time_off_types').select('*'), tenantId).order('name');
  if (is_active !== undefined) query = query.eq('is_active', is_active);
  const { data, error } = await query;
  if (error) throw new AppError(error.message, 500);
  return data;
}

/**
 * Check if a given date has an approved leave for an employee.
 * Used by Attendance/absence calculation.
 */
async function hasApprovedLeaveOnDate(tenantId, employeeId, date) {
  const { data, error } = await withTenant(
    db.from('time_off_requests')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('status', REQUEST_STATUS.APPROVED)
      .lte('start_date', date)
      .gte('end_date', date),
    tenantId
  ).limit(1);

  if (error) return false;
  return data && data.length > 0;
}

/**
 * Return the manager + tenant HR/Admin users an employee could route a leave
 * request to, for the "Send to" picker on the request form.
 */
async function getApprovalCandidates(tenantId, employeeId) {
  const { data: employee, error: empErr } = await withTenant(
    db.from('employees').select('id, manager_id').eq('id', employeeId),
    tenantId
  ).single();
  if (empErr || !employee) throw new AppError('Employee not found', 404, TIME_OFF_ERRORS.EMPLOYEE_NOT_FOUND);

  const candidates = [];

  if (employee.manager_id) {
    const { data: manager } = await withTenant(
      db.from('employees').select('user_id, first_name, last_name').eq('id', employee.manager_id),
      tenantId
    ).maybeSingle();
    if (manager?.user_id) {
      candidates.push({ user_id: manager.user_id, name: `${manager.first_name} ${manager.last_name}`, role: 'Manager' });
    }
  }

  const { data: hrUserRoles } = await db
    .from('user_roles')
    .select('user_id, roles!inner(slug)')
    .eq('tenant_id', tenantId)
    .in('roles.slug', ['admin', 'hr_manager', 'hr_payroll_manager', 'hr_payroll_user']);

  const hrUserIds = [...new Set((hrUserRoles || []).map((r) => r.user_id))]
    .filter((id) => !candidates.some((c) => c.user_id === id));

  if (hrUserIds.length > 0) {
    const { data: hrProfiles } = await db
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', hrUserIds);
    for (const p of hrProfiles || []) {
      candidates.push({ user_id: p.id, name: `${p.first_name} ${p.last_name}`, role: 'HR/Admin' });
    }
  }

  return candidates;
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
  // Routing
  getApprovalCandidates,
  // Utils
  hasApprovedLeaveOnDate,
  calculateDuration,
  isWorkingDay,
  selectAllocation,
};
