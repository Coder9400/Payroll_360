-- Phase 1 HR Master Data Seed

-- Insert Working Schedules
INSERT INTO public.working_schedules (id, name, code, hours_week) VALUES
('b2a8d3e2-1a4f-4b6c-8c1d-123456789010', 'Standard 40 Hours', 'STD-40', 40.00),
('c3b9e4f3-2b5g-5c7d-9d2e-098765432101', 'Part Time 20 Hours', 'PT-20', 20.00)
ON CONFLICT (code) DO NOTHING;

-- Insert Schedule Days
INSERT INTO public.working_schedule_days (schedule_id, day_of_week, is_working_day, start_time, end_time, break_minutes) VALUES
('b2a8d3e2-1a4f-4b6c-8c1d-123456789010', 1, true, '09:00', '18:00', 60),
('b2a8d3e2-1a4f-4b6c-8c1d-123456789010', 2, true, '09:00', '18:00', 60),
('b2a8d3e2-1a4f-4b6c-8c1d-123456789010', 3, true, '09:00', '18:00', 60),
('b2a8d3e2-1a4f-4b6c-8c1d-123456789010', 4, true, '09:00', '18:00', 60),
('b2a8d3e2-1a4f-4b6c-8c1d-123456789010', 5, true, '09:00', '18:00', 60),
('b2a8d3e2-1a4f-4b6c-8c1d-123456789010', 6, false, NULL, NULL, 0),
('b2a8d3e2-1a4f-4b6c-8c1d-123456789010', 0, false, NULL, NULL, 0)
ON CONFLICT (schedule_id, day_of_week) DO NOTHING;

-- Insert Departments
INSERT INTO public.departments (id, name, code, description) VALUES
('d1a8d3e2-1a4f-4b6c-8c1d-123456789010', 'Engineering', 'ENG', 'Software Engineering Department'),
('d2a8d3e2-1a4f-4b6c-8c1d-123456789010', 'Human Resources', 'HR', 'HR & Payroll Department'),
('d3a8d3e2-1a4f-4b6c-8c1d-123456789010', 'Sales', 'SLS', 'Sales Department')
ON CONFLICT (code) DO NOTHING;

-- Insert Job Positions
INSERT INTO public.job_positions (id, name, code, department_id, description) VALUES
('j1a8d3e2-1a4f-4b6c-8c1d-123456789010', 'Software Engineer', 'SE', 'd1a8d3e2-1a4f-4b6c-8c1d-123456789010', 'Backend and Frontend Engineer'),
('j2a8d3e2-1a4f-4b6c-8c1d-123456789010', 'HR Manager', 'HR-MGR', 'd2a8d3e2-1a4f-4b6c-8c1d-123456789010', 'HR Department Manager'),
('j3a8d3e2-1a4f-4b6c-8c1d-123456789010', 'Payroll Specialist', 'PAY-SPEC', 'd2a8d3e2-1a4f-4b6c-8c1d-123456789010', 'Processes Payroll'),
('j4a8d3e2-1a4f-4b6c-8c1d-123456789010', 'Sales Representative', 'SALES-REP', 'd3a8d3e2-1a4f-4b6c-8c1d-123456789010', 'Field Sales')
ON CONFLICT (code) DO NOTHING;

-- Insert Time Off Types
INSERT INTO public.time_off_types (id, name, code, unit, requires_allocation, requires_approval) VALUES
('t1a8d3e2-1a4f-4b6c-8c1d-123456789010', 'Annual Leave', 'AL', 'DAYS', true, true),
('t2a8d3e2-1a4f-4b6c-8c1d-123456789010', 'Sick Leave', 'SL', 'DAYS', true, false),
('t3a8d3e2-1a4f-4b6c-8c1d-123456789010', 'Time Off in Lieu', 'TOIL', 'HOURS', false, true)
ON CONFLICT (code) DO NOTHING;
