const { z } = require('zod');

const checkInSchema = z.object({
  employee_id: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  check_in: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)).optional(),
  notes: z.string().max(500).optional().nullable(),
});

const checkOutSchema = z.object({
  employee_id: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  check_out: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)).optional(),
  notes: z.string().max(500).optional().nullable(),
});

const createRegularizationSchema = z.object({
  attendance_id: z.string().uuid().optional(),
  attendanceId: z.string().uuid().optional(),
  employee_id: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  requested_check_in: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
  requested_check_out: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
  reason: z.string().min(3).max(1000),
}).refine(
  (data) => Boolean(data.attendance_id || data.attendanceId),
  { message: 'attendance_id is required', path: ['attendance_id'] }
).refine(
  (data) => new Date(data.requested_check_out) >= new Date(data.requested_check_in),
  { message: 'requested_check_out must be at or after requested_check_in', path: ['requested_check_out'] }
);

const actionRegularizationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
  action: z.enum(['approve', 'reject', 'APPROVE', 'REJECT']).optional(),
  rejection_reason: z.string().max(1000).optional().nullable(),
});

module.exports = {
  checkInSchema,
  checkOutSchema,
  createRegularizationSchema,
  actionRegularizationSchema,
};
