const { z } = require('zod');

const createDepartmentSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(50),
  description: z.string().optional(),
  manager_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
});

const updateDepartmentSchema = createDepartmentSchema.partial();

const createJobPositionSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(50),
  description: z.string().optional(),
  department_id: z.string().uuid(),
  is_active: z.boolean().optional(),
});

const updateJobPositionSchema = createJobPositionSchema.partial();

const createWorkingScheduleSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(50),
  description: z.string().optional().nullable(),
  days: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6).optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    is_working_day: z.boolean().optional(),
    isWorkingDay: z.boolean().optional(),
    start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).optional().nullable(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).optional().nullable(),
    end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).optional().nullable(),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).optional().nullable(),
    break_minutes: z.number().int().min(0).optional(),
    breakMinutes: z.number().int().min(0).optional(),
  })).optional(),
});

const updateWorkingScheduleSchema = createWorkingScheduleSchema.partial();

const assignScheduleSchema = z.object({
  employee_id: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  schedule_id: z.string().uuid().optional(),
  scheduleId: z.string().uuid().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
}).refine(
  (data) => Boolean(data.employee_id || data.employeeId),
  { message: 'employee_id is required', path: ['employee_id'] }
).refine(
  (data) => Boolean(data.schedule_id || data.scheduleId),
  { message: 'schedule_id is required', path: ['schedule_id'] }
).refine(
  (data) => Boolean(data.start_date || data.startDate),
  { message: 'start_date is required', path: ['start_date'] }
);

const createEmployeeSchema = z.object({
  employee_code: z.string().min(2).max(50),
  user_id: z.string().uuid().optional().nullable(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(50).optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  date_of_joining: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  department_id: z.string().uuid(),
  job_position_id: z.string().uuid(),
  manager_id: z.string().uuid().optional().nullable(),
  working_schedule_id: z.string().uuid(),
  employee_type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']),
  employment_status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED']).optional(),
  address: z.string().optional().nullable(),
  bank_account: z.string().optional().nullable(),
});

const updateEmployeeSchema = createEmployeeSchema.partial();

const createContractSchema = z.object({
  employee_id: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  contract_number: z.string().min(2).max(100).optional(),
  contractNumber: z.string().min(2).max(100).optional(),
  contract_type: z.string().optional(),
  contractType: z.string().optional(),
  employment_type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']).optional(),
  department_id: z.string().uuid().optional().nullable(),
  job_position_id: z.string().uuid().optional().nullable(),
  working_schedule_id: z.string().uuid().optional().nullable(),
  salary_structure_id: z.string().uuid().optional().nullable(),
  salaryStructureId: z.string().uuid().optional().nullable(),
  wage: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
}).refine(
  (data) => Boolean(data.employee_id || data.employeeId),
  { message: 'employee_id is required', path: ['employee_id'] }
).refine(
  (data) => Boolean(data.start_date || data.startDate),
  { message: 'start_date is required', path: ['start_date'] }
).refine(
  (data) => data.wage !== undefined && data.wage !== null,
  { message: 'wage is required', path: ['wage'] }
);

const updateContractSchema = z.object({
  employee_id: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  contract_number: z.string().min(2).max(100).optional(),
  contract_type: z.string().optional(),
  contractType: z.string().optional(),
  employment_type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']).optional(),
  department_id: z.string().uuid().optional().nullable(),
  job_position_id: z.string().uuid().optional().nullable(),
  working_schedule_id: z.string().uuid().optional().nullable(),
  salary_structure_id: z.string().uuid().optional().nullable(),
  salaryStructureId: z.string().uuid().optional().nullable(),
  wage: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
});

const createTimeOffTypeSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(50),
  unit: z.enum(['DAYS', 'HOURS']).optional(),
  requires_allocation: z.boolean().optional(),
  requires_approval: z.boolean().optional(),
  payroll_integration: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

const updateTimeOffTypeSchema = createTimeOffTypeSchema.partial();

module.exports = {
  createDepartmentSchema,
  updateDepartmentSchema,
  createJobPositionSchema,
  updateJobPositionSchema,
  createWorkingScheduleSchema,
  updateWorkingScheduleSchema,
  assignScheduleSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  createContractSchema,
  updateContractSchema,
  createTimeOffTypeSchema,
  updateTimeOffTypeSchema,
};

