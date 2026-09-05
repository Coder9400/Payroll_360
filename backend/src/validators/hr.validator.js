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
  days: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    is_working_day: z.boolean(),
    start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
    end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
    break_minutes: z.number().int().min(0).default(60),
  })).min(7).max(7),
});

const updateWorkingScheduleSchema = createWorkingScheduleSchema.partial();

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
  employee_id: z.string().uuid(),
  contract_number: z.string().min(2).max(100),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']).optional(),
  department_id: z.string().uuid(),
  job_position_id: z.string().uuid(),
  working_schedule_id: z.string().uuid(),
  wage: z.number().positive(),
  currency: z.string().length(3).optional(),
  employment_type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']),
});

const updateContractSchema = createContractSchema.partial();

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
  createEmployeeSchema,
  updateEmployeeSchema,
  createContractSchema,
  updateContractSchema,
  createTimeOffTypeSchema,
  updateTimeOffTypeSchema,
};
