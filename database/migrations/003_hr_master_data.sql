-- Phase 1 HR Master Data Schema Migration

-- Departments
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    manager_id UUID, -- Will reference employees later
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Job Positions
CREATE TABLE public.job_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Working Schedules
CREATE TABLE public.working_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    hours_week NUMERIC(5,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Working Schedule Days
CREATE TABLE public.working_schedule_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.working_schedules(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    is_working_day BOOLEAN DEFAULT true NOT NULL,
    start_time TIME,
    end_time TIME,
    break_minutes INTEGER DEFAULT 60 NOT NULL,
    UNIQUE(schedule_id, day_of_week)
);

-- Employees
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL, -- Assuming Supabase auth
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    date_of_birth DATE,
    date_of_joining DATE NOT NULL,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    job_position_id UUID NOT NULL REFERENCES public.job_positions(id) ON DELETE RESTRICT,
    manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    working_schedule_id UUID NOT NULL REFERENCES public.working_schedules(id) ON DELETE RESTRICT,
    employee_type VARCHAR(50) NOT NULL, -- e.g., FULL_TIME, PART_TIME
    employment_status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL,
    address TEXT,
    bank_account TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Now we can safely add the foreign key to departments
ALTER TABLE public.departments ADD CONSTRAINT fk_department_manager FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;

-- Contracts
CREATE TABLE public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    contract_number VARCHAR(100) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    job_position_id UUID NOT NULL REFERENCES public.job_positions(id) ON DELETE RESTRICT,
    working_schedule_id UUID NOT NULL REFERENCES public.working_schedules(id) ON DELETE RESTRICT,
    wage NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
    employment_type VARCHAR(50) NOT NULL,
    salary_structure_id UUID, -- For future Phase 6
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT contract_dates_check CHECK (end_date IS NULL OR start_date <= end_date)
);

-- Time Off Types
CREATE TABLE public.time_off_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    unit VARCHAR(20) DEFAULT 'DAYS' NOT NULL, -- DAYS or HOURS
    requires_allocation BOOLEAN DEFAULT true NOT NULL,
    requires_approval BOOLEAN DEFAULT true NOT NULL,
    payroll_integration BOOLEAN DEFAULT true NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Triggers to auto-update 'updated_at' where needed (Assuming a trigger function `update_updated_at_column` exists)
-- (We'll skip explicit triggers for simplicity and do it in application layer or assume it exists in Supabase generic)
