-- =============================================================================
-- Phase 2: Attendance & Time Off Operations
-- Migration: 004_attendance_time_off.sql
-- Depends on: 003_hr_master_data.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ATTENDANCE TABLE
-- Tracks daily employee check-in/out records.
-- One record per employee per date (unique constraint).
-- Absence is NOT stored as a row; absence is derived from schedule + missing record.
-- -----------------------------------------------------------------------------
CREATE TABLE public.attendance (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id       UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date   DATE NOT NULL,

    -- Timestamps for check-in and check-out (timezone-aware)
    check_in          TIMESTAMP WITH TIME ZONE,
    check_out         TIMESTAMP WITH TIME ZONE,

    -- Calculated by backend on checkout; stored for efficient reporting
    worked_hours      NUMERIC(5,2),

    -- Status: PRESENT | LATE | HALF_DAY | OVERTIME | MISSING_CHECKOUT | CORRECTED
    -- ABSENT is NOT stored here — derived via schedule + no-record logic.
    status            VARCHAR(30) NOT NULL DEFAULT 'MISSING_CHECKOUT',

    -- Schedule-derived expected values (snapshot at time of record creation)
    expected_start    TIME,
    expected_end      TIME,
    expected_hours    NUMERIC(5,2),
    break_minutes     INTEGER DEFAULT 0,

    -- Overtime hours (if worked > expected). Null = no overtime tracked yet.
    overtime_hours    NUMERIC(5,2),

    -- Manual correction tracking
    is_manual_edit    BOOLEAN NOT NULL DEFAULT false,
    correction_reason TEXT,
    notes             TEXT,

    -- Audit
    created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Business rule: one attendance record per employee per date
    CONSTRAINT attendance_employee_date_unique UNIQUE(employee_id, attendance_date),

    -- Business rule: check_out must be after check_in
    CONSTRAINT attendance_checkout_after_checkin CHECK (
        check_out IS NULL OR check_in IS NULL OR check_out > check_in
    )
);

-- Index for common queries
CREATE INDEX idx_attendance_employee_id ON public.attendance(employee_id);
CREATE INDEX idx_attendance_date ON public.attendance(attendance_date);
CREATE INDEX idx_attendance_status ON public.attendance(status);
CREATE INDEX idx_attendance_employee_date ON public.attendance(employee_id, attendance_date);

-- -----------------------------------------------------------------------------
-- TIME OFF ALLOCATIONS TABLE
-- Represents a granted leave quota for an employee for a specific time-off type.
-- Multiple allocations can exist per employee per type (e.g., annual 2026 + carry-over).
-- -----------------------------------------------------------------------------
CREATE TABLE public.time_off_allocations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id      UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    time_off_type_id UUID NOT NULL REFERENCES public.time_off_types(id) ON DELETE RESTRICT,

    -- Amounts (unit matches the time_off_type unit: DAYS or HOURS)
    allocated_amount NUMERIC(8,2) NOT NULL CHECK (allocated_amount >= 0),
    approved_amount  NUMERIC(8,2) DEFAULT 0 NOT NULL CHECK (approved_amount >= 0),

    -- taken_amount: sum of consumed APPROVED requests. Updated transactionally on approve/cancel.
    taken_amount     NUMERIC(8,2) DEFAULT 0 NOT NULL CHECK (taken_amount >= 0),

    -- remaining_amount: approved_amount - taken_amount. Updated transactionally.
    remaining_amount NUMERIC(8,2) DEFAULT 0 NOT NULL,

    -- Validity period for this allocation
    valid_from       DATE NOT NULL,
    valid_to         DATE,

    -- Status: DRAFT | PENDING_APPROVAL | APPROVED | REFUSED | EXPIRED | CANCELLED
    status           VARCHAR(30) NOT NULL DEFAULT 'DRAFT',

    -- Approval tracking
    approved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at      TIMESTAMP WITH TIME ZONE,
    refusal_reason   TEXT,

    -- Audit
    created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- remaining cannot go negative (concurrency protection at DB level)
    CONSTRAINT allocation_remaining_non_negative CHECK (remaining_amount >= 0),
    CONSTRAINT allocation_taken_not_exceed_approved CHECK (taken_amount <= approved_amount)
);

-- Indexes
CREATE INDEX idx_allocations_employee_id ON public.time_off_allocations(employee_id);
CREATE INDEX idx_allocations_type_id ON public.time_off_allocations(time_off_type_id);
CREATE INDEX idx_allocations_status ON public.time_off_allocations(status);
CREATE INDEX idx_allocations_validity ON public.time_off_allocations(valid_from, valid_to);

-- -----------------------------------------------------------------------------
-- TIME OFF REQUESTS TABLE
-- Represents an employee's request for time off.
-- Duration is calculated by the backend (excludes non-working days from schedule).
-- -----------------------------------------------------------------------------
CREATE TABLE public.time_off_requests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id      UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    time_off_type_id UUID NOT NULL REFERENCES public.time_off_types(id) ON DELETE RESTRICT,

    -- Date range of the request
    start_date       DATE NOT NULL,
    end_date         DATE NOT NULL,

    -- Duration calculated by backend (excludes non-working days per employee schedule)
    duration         NUMERIC(8,2) NOT NULL CHECK (duration > 0),

    -- Unit from the time_off_type snapshot at request creation
    unit             VARCHAR(10) NOT NULL DEFAULT 'DAYS',

    reason           TEXT,

    -- Status: DRAFT | PENDING | APPROVED | REFUSED | CANCELLED
    status           VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    -- Approval tracking
    approved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at      TIMESTAMP WITH TIME ZONE,
    refusal_reason   TEXT,

    -- Audit
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT request_end_gte_start CHECK (end_date >= start_date)
);

-- Indexes for overlap detection and filtering
CREATE INDEX idx_requests_employee_id ON public.time_off_requests(employee_id);
CREATE INDEX idx_requests_type_id ON public.time_off_requests(time_off_type_id);
CREATE INDEX idx_requests_status ON public.time_off_requests(status);
CREATE INDEX idx_requests_date_range ON public.time_off_requests(employee_id, start_date, end_date);

-- =============================================================================
-- COMMENTS / DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE public.attendance IS
  'Phase 2: Daily attendance records. One row per employee per date. Absence is derived (not stored).';

COMMENT ON COLUMN public.attendance.status IS
  'PRESENT=normal day worked, LATE=checked in after schedule start, HALF_DAY=partial day, OVERTIME=worked beyond schedule, MISSING_CHECKOUT=no check_out recorded, CORRECTED=manually corrected by HR';

COMMENT ON COLUMN public.attendance.break_minutes IS
  'Break duration in minutes, snapshot from working_schedule_days at check-in time.';

COMMENT ON TABLE public.time_off_allocations IS
  'Phase 2: Leave quota allocations per employee. Multiple allocations per type supported (e.g. annual + carry-over). Balance is: approved_amount - taken_amount = remaining_amount.';

COMMENT ON TABLE public.time_off_requests IS
  'Phase 2: Employee leave requests. Duration excludes non-working days per employee working schedule.';
