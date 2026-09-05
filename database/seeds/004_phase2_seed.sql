-- =============================================================================
-- Phase 2 Seed Data: Attendance & Time Off
-- Depends on: 003_hr_master_data_seed.sql
-- Provides: Realistic operational HR scenarios for development/testing.
-- =============================================================================
-- NOTE: Employee IDs and references use the same UUIDs from Phase 1 seed.
-- Run 003_hr_master_data_seed.sql first, then insert employees, then this seed.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PREREQUISITE: Ensure at least 2 employees exist referencing the Phase 1 seed data
-- (These may already exist if employees were created via UI/API.
--  This seed inserts them only if they don't conflict.)
-- -----------------------------------------------------------------------------
INSERT INTO public.employees (
    id, employee_code, first_name, last_name, email, date_of_joining,
    department_id, job_position_id, working_schedule_id,
    employee_type, employment_status
) VALUES
(
    'e1000000-0000-4000-8000-000000000001',
    'EMP-001',
    'Alice', 'Jonson',
    'alice.jonson@peoplepay360.local',
    '2025-01-01',
    'd1a8d3e2-1a4f-4b6c-8c1d-123456789010', -- Engineering
    'j1a8d3e2-1a4f-4b6c-8c1d-123456789010', -- Software Engineer
    'b2a8d3e2-1a4f-4b6c-8c1d-123456789010', -- Standard 40h
    'FULL_TIME',
    'ACTIVE'
),
(
    'e2000000-0000-4000-8000-000000000002',
    'EMP-002',
    'Bob', 'Carter',
    'bob.carter@peoplepay360.local',
    '2025-03-01',
    'd2a8d3e2-1a4f-4b6c-8c1d-123456789010', -- HR
    'j2a8d3e2-1a4f-4b6c-8c1d-123456789010', -- HR Manager
    'b2a8d3e2-1a4f-4b6c-8c1d-123456789010', -- Standard 40h
    'FULL_TIME',
    'ACTIVE'
),
(
    'e3000000-0000-4000-8000-000000000003',
    'EMP-003',
    'Carol', 'Nguyen',
    'carol.nguyen@peoplepay360.local',
    '2025-06-01',
    'd1a8d3e2-1a4f-4b6c-8c1d-123456789010', -- Engineering
    'j1a8d3e2-1a4f-4b6c-8c1d-123456789010', -- Software Engineer
    'b2a8d3e2-1a4f-4b6c-8c1d-123456789010', -- Standard 40h
    'FULL_TIME',
    'ACTIVE'
)
ON CONFLICT (employee_code) DO NOTHING;

-- =============================================================================
-- ATTENDANCE RECORDS
-- Covers: PRESENT, LATE, MISSING_CHECKOUT, OVERTIME, CORRECTED scenarios
-- =============================================================================

INSERT INTO public.attendance (
    id, employee_id, attendance_date,
    check_in, check_out, worked_hours, status,
    expected_start, expected_end, expected_hours, break_minutes,
    overtime_hours, is_manual_edit, correction_reason, notes
) VALUES

-- Alice: Monday PRESENT
(
    'a1000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    '2026-09-07',
    '2026-09-07T04:00:00Z', -- 09:30 IST = 04:00 UTC
    '2026-09-07T12:30:00Z', -- 18:00 IST = 12:30 UTC
    8.00,
    'PRESENT',
    '09:00', '18:00', 8.00, 60,
    NULL, false, NULL, 'Normal working day'
),

-- Alice: Tuesday LATE (checked in at 09:17)
(
    'a2000000-0000-4000-8000-000000000002',
    'e1000000-0000-4000-8000-000000000001',
    '2026-09-08',
    '2026-09-08T03:47:00Z', -- 09:17 IST = 03:47 UTC (17 min late)
    '2026-09-08T12:30:00Z', -- 18:00 IST
    7.72,
    'LATE',
    '09:00', '18:00', 8.00, 60,
    NULL, false, NULL, 'Arrived 17 minutes late'
),

-- Alice: Wednesday MISSING_CHECKOUT (forgot to check out)
(
    'a3000000-0000-4000-8000-000000000003',
    'e1000000-0000-4000-8000-000000000001',
    '2026-09-09',
    '2026-09-09T03:30:00Z', -- 09:00 IST
    NULL,                   -- No checkout
    NULL,
    'MISSING_CHECKOUT',
    '09:00', '18:00', 8.00, 60,
    NULL, false, NULL, 'Employee forgot to check out'
),

-- Alice: Thursday OVERTIME (worked 10 hours)
(
    'a4000000-0000-4000-8000-000000000004',
    'e1000000-0000-4000-8000-000000000001',
    '2026-09-10',
    '2026-09-10T03:30:00Z', -- 09:00 IST
    '2026-09-10T14:30:00Z', -- 20:00 IST (10 hours worked after break)
    10.00,
    'OVERTIME',
    '09:00', '18:00', 8.00, 60,
    2.00, false, NULL, 'Sprint delivery - worked late'
),

-- Alice: Friday CORRECTED (HR fixed wrong check-in)
(
    'a5000000-0000-4000-8000-000000000005',
    'e1000000-0000-4000-8000-000000000001',
    '2026-09-11',
    '2026-09-11T03:30:00Z', -- 09:00 IST (corrected)
    '2026-09-11T12:30:00Z', -- 18:00 IST
    8.00,
    'CORRECTED',
    '09:00', '18:00', 8.00, 60,
    NULL, true, 'System recorded wrong check-in time; corrected by HR', 'Manual correction applied'
),

-- Bob: Monday PRESENT (HR Manager employee)
(
    'a6000000-0000-4000-8000-000000000006',
    'e2000000-0000-4000-8000-000000000002',
    '2026-09-07',
    '2026-09-07T03:30:00Z',
    '2026-09-07T12:30:00Z',
    8.00,
    'PRESENT',
    '09:00', '18:00', 8.00, 60,
    NULL, false, NULL, NULL
)

ON CONFLICT (employee_id, attendance_date) DO NOTHING;

-- =============================================================================
-- TIME OFF ALLOCATIONS
-- Scenarios: Active approved allocation, pending, refused, expired
-- =============================================================================

INSERT INTO public.time_off_allocations (
    id, employee_id, time_off_type_id,
    allocated_amount, approved_amount, taken_amount, remaining_amount,
    valid_from, valid_to,
    status
) VALUES

-- Alice: Annual Leave 2026 — APPROVED with some taken
(
    'la100000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    't1a8d3e2-1a4f-4b6c-8c1d-123456789010', -- Annual Leave
    20, 20, 3, 17,
    '2026-01-01', '2026-12-31',
    'APPROVED'
),

-- Alice: Sick Leave — APPROVED (no allocation needed technically, but some orgs allocate it)
(
    'la200000-0000-4000-8000-000000000002',
    'e1000000-0000-4000-8000-000000000001',
    't2a8d3e2-1a4f-4b6c-8c1d-123456789010', -- Sick Leave
    15, 15, 0, 15,
    '2026-01-01', '2026-12-31',
    'APPROVED'
),

-- Bob: Annual Leave — APPROVED
(
    'la300000-0000-4000-8000-000000000003',
    'e2000000-0000-4000-8000-000000000002',
    't1a8d3e2-1a4f-4b6c-8c1d-123456789010',
    20, 20, 0, 20,
    '2026-01-01', '2026-12-31',
    'APPROVED'
),

-- Carol: Annual Leave — PENDING_APPROVAL (waiting)
(
    'la400000-0000-4000-8000-000000000004',
    'e3000000-0000-4000-8000-000000000003',
    't1a8d3e2-1a4f-4b6c-8c1d-123456789010',
    20, 0, 0, 0,
    '2026-01-01', '2026-12-31',
    'PENDING_APPROVAL'
),

-- Alice: Expired prior year allocation
(
    'la500000-0000-4000-8000-000000000005',
    'e1000000-0000-4000-8000-000000000001',
    't1a8d3e2-1a4f-4b6c-8c1d-123456789010',
    5, 5, 5, 0,
    '2025-01-01', '2025-12-31',
    'EXPIRED'
)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TIME OFF REQUESTS
-- Scenarios: APPROVED (with balance consumed), PENDING, REFUSED, CANCELLED
-- =============================================================================

INSERT INTO public.time_off_requests (
    id, employee_id, time_off_type_id,
    start_date, end_date, duration, unit,
    reason, status
) VALUES

-- Alice: APPROVED annual leave (Sep 1-3 = 3 working days)
-- Balance already reflects this: taken_amount=3, remaining_amount=17
(
    'lr100000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001',
    't1a8d3e2-1a4f-4b6c-8c1d-123456789010',
    '2026-09-01', '2026-09-03', 3, 'DAYS',
    'Family vacation', 'APPROVED'
),

-- Alice: PENDING sick leave request
(
    'lr200000-0000-4000-8000-000000000002',
    'e1000000-0000-4000-8000-000000000001',
    't2a8d3e2-1a4f-4b6c-8c1d-123456789010',
    '2026-09-14', '2026-09-14', 1, 'DAYS',
    'Medical appointment', 'PENDING'
),

-- Alice: REFUSED request (excess leave request)
(
    'lr300000-0000-4000-8000-000000000003',
    'e1000000-0000-4000-8000-000000000001',
    't1a8d3e2-1a4f-4b6c-8c1d-123456789010',
    '2026-10-01', '2026-10-21', 15, 'DAYS',
    'Extended travel', 'REFUSED'
),

-- Carol: PENDING annual leave request (waiting for allocation approval)
(
    'lr400000-0000-4000-8000-000000000004',
    'e3000000-0000-4000-8000-000000000003',
    't1a8d3e2-1a4f-4b6c-8c1d-123456789010',
    '2026-09-15', '2026-09-17', 3, 'DAYS',
    'Personal leave', 'DRAFT'
),

-- Bob: CANCELLED leave (approved but then cancelled)
(
    'lr500000-0000-4000-8000-000000000005',
    'e2000000-0000-4000-8000-000000000002',
    't1a8d3e2-1a4f-4b6c-8c1d-123456789010',
    '2026-08-25', '2026-08-27', 3, 'DAYS',
    'Holiday weekend', 'CANCELLED'
)

ON CONFLICT (id) DO NOTHING;
