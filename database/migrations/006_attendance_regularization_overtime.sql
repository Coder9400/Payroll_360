-- =============================================================
-- Migration 006: Attendance, Regularization & Overtime Schema
-- Phase 5 - PeoplePay360
-- =============================================================

-- =============================================================
-- 1. ATTENDANCE RECORDS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMPTZ NOT NULL,
    check_out TIMESTAMPTZ,
    worked_minutes INTEGER DEFAULT 0 NOT NULL,
    expected_minutes INTEGER DEFAULT 0 NOT NULL,
    overtime_minutes INTEGER DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'INCOMPLETE' NOT NULL
        CHECK (status IN ('PRESENT', 'LATE', 'ABSENT', 'INCOMPLETE', 'OVERTIME')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_attendance_times CHECK (check_out IS NULL OR check_out >= check_in)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_id ON public.attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_attendance_records_emp_date ON public.attendance_records(employee_id, date);

-- Prevent multiple open attendance sessions per employee
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_one_open_session 
ON public.attendance_records (employee_id) 
WHERE check_out IS NULL;

-- =============================================================
-- 2. ATTENDANCE REGULARIZATION REQUESTS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.attendance_regularization_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    requested_check_in TIMESTAMPTZ NOT NULL,
    requested_check_out TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_requested_times CHECK (requested_check_out >= requested_check_in)
);

CREATE INDEX IF NOT EXISTS idx_reg_requests_attendance_id ON public.attendance_regularization_requests(attendance_id);
CREATE INDEX IF NOT EXISTS idx_reg_requests_employee_id ON public.attendance_regularization_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_reg_requests_status ON public.attendance_regularization_requests(status);

-- =============================================================
-- 3. OVERTIME RECORDS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.overtime_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    worked_minutes INTEGER NOT NULL,
    expected_minutes INTEGER NOT NULL,
    overtime_minutes INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_overtime_records_employee_id ON public.overtime_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_records_date ON public.overtime_records(date);
CREATE INDEX IF NOT EXISTS idx_overtime_records_status ON public.overtime_records(status);

-- =============================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_regularization_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_records ENABLE ROW LEVEL SECURITY;

-- Service role has full access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on attendance_records') THEN
        CREATE POLICY "Service role full access on attendance_records" ON public.attendance_records FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on regularization_requests') THEN
        CREATE POLICY "Service role full access on regularization_requests" ON public.attendance_regularization_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on overtime_records') THEN
        CREATE POLICY "Service role full access on overtime_records" ON public.overtime_records FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;
