-- =============================================================
-- Seed 003: Employee & Organization Demo Data
-- Phase 3 - PeoplePay360
-- =============================================================

-- =============================================================
-- DEPARTMENTS
-- =============================================================
INSERT INTO departments (id, name, description, is_active)
VALUES
  ('d0000001-0000-4000-8000-000000000001', 'Engineering',       'Software development and infrastructure',      TRUE),
  ('d0000001-0000-4000-8000-000000000002', 'Human Resources',   'People operations, hiring, and culture',       TRUE),
  ('d0000001-0000-4000-8000-000000000003', 'Finance & Payroll', 'Financial planning, accounting, and payroll',  TRUE)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- POSITIONS
-- =============================================================
INSERT INTO positions (id, title, description, department_id, is_active)
VALUES
  ('p0000001-0000-4000-8000-000000000001', 'Software Engineer',      'Builds and maintains product features',       'd0000001-0000-4000-8000-000000000001', TRUE),
  ('p0000001-0000-4000-8000-000000000002', 'Senior Software Engineer','Leads technical design and code reviews',    'd0000001-0000-4000-8000-000000000001', TRUE),
  ('p0000001-0000-4000-8000-000000000003', 'HR Manager',             'Oversees HR operations and employee welfare', 'd0000001-0000-4000-8000-000000000002', TRUE),
  ('p0000001-0000-4000-8000-000000000004', 'HR Executive',           'Handles day-to-day HR activities',            'd0000001-0000-4000-8000-000000000002', TRUE),
  ('p0000001-0000-4000-8000-000000000005', 'Payroll Manager',        'Manages payroll runs and salary structures',  'd0000001-0000-4000-8000-000000000003', TRUE)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- EMPLOYEES
-- =============================================================
-- NOTE: manager_id set in a separate UPDATE pass to avoid FK ordering issues.

INSERT INTO employees (
  id, employee_number, first_name, last_name, email, phone,
  department_id, position_id, manager_id,
  date_of_joining, employment_status, is_active
) VALUES
  -- 1. Admin / CTO
  ('e0000001-0000-4000-8000-000000000001',
   'EMP-0001', 'Alice', 'Sharma', 'alice.sharma@peoplepay360.com', '+91-9000000001',
   'd0000001-0000-4000-8000-000000000001',
   'p0000001-0000-4000-8000-000000000002',
   NULL,
   '2023-01-15', 'active', TRUE),

  -- 2. HR Manager
  ('e0000001-0000-4000-8000-000000000002',
   'EMP-0002', 'Rohan', 'Mehta', 'rohan.mehta@peoplepay360.com', '+91-9000000002',
   'd0000001-0000-4000-8000-000000000002',
   'p0000001-0000-4000-8000-000000000003',
   'e0000001-0000-4000-8000-000000000001',
   '2023-03-01', 'active', TRUE),

  -- 3. Payroll Manager
  ('e0000001-0000-4000-8000-000000000003',
   'EMP-0003', 'Priya', 'Patel', 'priya.patel@peoplepay360.com', '+91-9000000003',
   'd0000001-0000-4000-8000-000000000003',
   'p0000001-0000-4000-8000-000000000005',
   'e0000001-0000-4000-8000-000000000001',
   '2023-04-10', 'active', TRUE),

  -- 4. Software Engineer (reports to Alice)
  ('e0000001-0000-4000-8000-000000000004',
   'EMP-0004', 'Arjun', 'Singh', 'arjun.singh@peoplepay360.com', '+91-9000000004',
   'd0000001-0000-4000-8000-000000000001',
   'p0000001-0000-4000-8000-000000000001',
   'e0000001-0000-4000-8000-000000000001',
   '2023-06-15', 'active', TRUE),

  -- 5. HR Executive (reports to Rohan)
  ('e0000001-0000-4000-8000-000000000005',
   'EMP-0005', 'Nisha', 'Gupta', 'nisha.gupta@peoplepay360.com', '+91-9000000005',
   'd0000001-0000-4000-8000-000000000002',
   'p0000001-0000-4000-8000-000000000004',
   'e0000001-0000-4000-8000-000000000002',
   '2023-09-01', 'active', TRUE),

  -- 6. Inactive/terminated employee
  ('e0000001-0000-4000-8000-000000000006',
   'EMP-0006', 'Karan', 'Verma', 'karan.verma@peoplepay360.com', '+91-9000000006',
   'd0000001-0000-4000-8000-000000000001',
   'p0000001-0000-4000-8000-000000000001',
   'e0000001-0000-4000-8000-000000000001',
   '2023-07-01', 'terminated', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Assign department heads after employees are inserted
UPDATE departments SET head_id = 'e0000001-0000-4000-8000-000000000001'
  WHERE id = 'd0000001-0000-4000-8000-000000000001';
UPDATE departments SET head_id = 'e0000001-0000-4000-8000-000000000002'
  WHERE id = 'd0000001-0000-4000-8000-000000000002';
UPDATE departments SET head_id = 'e0000001-0000-4000-8000-000000000003'
  WHERE id = 'd0000001-0000-4000-8000-000000000003';
