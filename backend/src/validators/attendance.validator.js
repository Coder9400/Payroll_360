/**
 * Phase 2 Validators: Attendance, Time Off Allocations, Time Off Requests
 * Uses Zod for schema validation, consistent with Phase 1 hr.validator.js.
 */
const { z } = require('zod');
const { ATTENDANCE_STATUS, VALID_MANUAL_STATUSES } = require('../config/attendanceConstants');

// ---------------------------------------------------------------------------
// ATTENDANCE
// ---------------------------------------------------------------------------

const checkInSchema = z.object({
  // HR-only: override the employee to check in for. Resolved from auth user by default.
  employee_id: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});

const checkOutSchema = z.object({
  // HR-only: override the employee to check out for.
  employee_id: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});

const correctAttendanceSchema = z.object({
  attendance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  check_in: z.string().datetime({ offset: true }).optional().nullable(),
  check_out: z.string().datetime({ offset: true }).optional().nullable(),
  status: z.enum(VALID_MANUAL_STATUSES).optional(),
  notes: z.string().max(1000).optional().nullable(),
  correction_reason: z.string().min(5).max(500),
}).refine(
  (data) => data.check_out == null || data.check_in == null || new Date(data.check_out) > new Date(data.check_in),
  { message: 'check_out must be after check_in', path: ['check_out'] }
);

// ---------------------------------------------------------------------------
// TIME OFF ALLOCATIONS
// ---------------------------------------------------------------------------

const createAllocationSchema = z.object({
  employee_id: z.string().uuid(),
  time_off_type_id: z.string().uuid(),
  allocated_amount: z.number().positive(),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valid_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
}).refine(
  (data) => !data.valid_to || data.valid_to >= data.valid_from,
  { message: 'valid_to must be after or equal to valid_from', path: ['valid_to'] }
);

const updateAllocationSchema = z.object({
  allocated_amount: z.number().positive().optional(),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  valid_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
}).refine(
  (data) => !data.valid_to || !data.valid_from || data.valid_to >= data.valid_from,
  { message: 'valid_to must be after or equal to valid_from', path: ['valid_to'] }
);

const refuseAllocationSchema = z.object({
  refusal_reason: z.string().min(5).max(500).optional(),
});

// ---------------------------------------------------------------------------
// TIME OFF REQUESTS
// ---------------------------------------------------------------------------

const createRequestSchema = z.object({
  employee_id: z.string().uuid().optional(), // HR can submit on behalf of employee
  time_off_type_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(1000).optional(),
  // Duration is calculated by the backend; frontend may send a hint but it is ignored
}).refine(
  (data) => data.end_date >= data.start_date,
  { message: 'end_date must be after or equal to start_date', path: ['end_date'] }
);

const updateRequestSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reason: z.string().max(1000).optional(),
  time_off_type_id: z.string().uuid().optional(),
}).refine(
  (data) => !data.start_date || !data.end_date || data.end_date >= data.start_date,
  { message: 'end_date must be after or equal to start_date', path: ['end_date'] }
);

const refuseRequestSchema = z.object({
  refusal_reason: z.string().min(5).max(500).optional(),
});

const cancelRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});

module.exports = {
  checkInSchema,
  checkOutSchema,
  correctAttendanceSchema,
  createAllocationSchema,
  updateAllocationSchema,
  refuseAllocationSchema,
  createRequestSchema,
  updateRequestSchema,
  refuseRequestSchema,
  cancelRequestSchema,
};
