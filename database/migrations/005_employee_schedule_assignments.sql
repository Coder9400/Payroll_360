-- Migration: 005_employee_schedule_assignments.sql
-- Description: Creates employee_schedule_assignments table for Phase 4 Working Schedules.

CREATE TABLE IF NOT EXISTS public.employee_schedule_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES public.working_schedules(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_assignment_dates CHECK (end_date IS NULL OR start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS idx_emp_sched_emp_id ON public.employee_schedule_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_sched_schedule_id ON public.employee_schedule_assignments(schedule_id);
