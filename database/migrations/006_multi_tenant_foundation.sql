-- =============================================================================
-- Multi-Tenant Foundation Migration
-- Migration: 006_multi_tenant_foundation.sql
-- Depends on: 002_auth_rbac_schema.sql, 003_hr_master_data.sql,
--             004_attendance_time_off.sql, 005_payroll_schema.sql
--
-- Adds tenants/legal_entities and tenant_id scoping to every HR/payroll/
-- time-off table so multiple companies can share this schema in isolation.
-- Also adds time_off_requests.recipient_user_id so an employee can route a
-- leave request to a specific approver instead of a blanket HR queue.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TENANTS & LEGAL ENTITIES
-- -----------------------------------------------------------------------------
CREATE TABLE public.tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.legal_entities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  country     VARCHAR(100),
  is_default  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX idx_legal_entities_tenant ON public.legal_entities(tenant_id);

-- -----------------------------------------------------------------------------
-- ADD tenant_id (nullable for now — backfilled below, then locked to NOT NULL)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles              ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.user_roles            ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.departments           ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.job_positions         ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.working_schedules     ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.employees             ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.contracts             ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.time_off_types        ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.time_off_allocations  ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.time_off_requests     ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.attendance            ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.salary_structures     ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.payruns               ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.payslips              ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

-- Leave request routing: who this request was addressed to (defaults to the
-- employee's manager at creation time; HR/Admin can always act as a fallback).
ALTER TABLE public.time_off_requests
  ADD COLUMN recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- BACKFILL: one "Default Tenant" so all pre-existing rows (seed/demo data)
-- keep working under NOT NULL tenant_id.
-- -----------------------------------------------------------------------------
INSERT INTO public.tenants (id, name, slug)
VALUES ('00000000-0000-4000-9000-000000000001', 'Default Tenant', 'default');

INSERT INTO public.legal_entities (tenant_id, name, is_default)
VALUES ('00000000-0000-4000-9000-000000000001', 'Default Tenant', true);

UPDATE public.profiles             SET tenant_id = '00000000-0000-4000-9000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.user_roles           SET tenant_id = '00000000-0000-4000-9000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.departments          SET tenant_id = '00000000-0000-4000-9000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.job_positions        SET tenant_id = '00000000-0000-4000-9000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.working_schedules    SET tenant_id = '00000000-0000-4000-9000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.employees            SET tenant_id = '00000000-0000-4000-9000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.contracts            SET tenant_id = '00000000-0000-4000-9000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.time_off_types       SET tenant_id = '00000000-0000-4000-9000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.time_off_allocations SET tenant_id = '00000000-0000-4000-9000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.time_off_requests    SET tenant_id = '00000000-0000-4000-9000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.attendance           SET tenant_id = '00000000-0000-4000-9000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.salary_structures    SET tenant_id = '00000000-0000-4000-9000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.payruns              SET tenant_id = '00000000-0000-4000-9000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.payslips             SET tenant_id = '00000000-0000-4000-9000-000000000001' WHERE tenant_id IS NULL;

-- -----------------------------------------------------------------------------
-- ENFORCE NOT NULL now that every existing row has a tenant
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles              ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.user_roles            ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.departments           ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.job_positions         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.working_schedules     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.employees             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.contracts             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.time_off_types        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.time_off_allocations  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.time_off_requests     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.attendance            ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.salary_structures     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.payruns               ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.payslips              ALTER COLUMN tenant_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- COMPOSITE-UNIQUE FIXES
-- Drop the old globally-unique constraints (auto-named <table>_<column>_key
-- for the inline UNIQUE declarations in 003/005) and replace with
-- UNIQUE(tenant_id, column) so two tenants can reuse the same code/name.
-- employees.user_id and profiles.email stay globally unique on purpose
-- (Supabase Auth already enforces one global email per auth account).
-- -----------------------------------------------------------------------------
ALTER TABLE public.departments DROP CONSTRAINT departments_name_key;
ALTER TABLE public.departments DROP CONSTRAINT departments_code_key;
ALTER TABLE public.departments ADD CONSTRAINT departments_tenant_name_key UNIQUE (tenant_id, name);
ALTER TABLE public.departments ADD CONSTRAINT departments_tenant_code_key UNIQUE (tenant_id, code);

ALTER TABLE public.job_positions DROP CONSTRAINT job_positions_code_key;
ALTER TABLE public.job_positions ADD CONSTRAINT job_positions_tenant_code_key UNIQUE (tenant_id, code);

ALTER TABLE public.working_schedules DROP CONSTRAINT working_schedules_code_key;
ALTER TABLE public.working_schedules ADD CONSTRAINT working_schedules_tenant_code_key UNIQUE (tenant_id, code);

ALTER TABLE public.employees DROP CONSTRAINT employees_employee_code_key;
ALTER TABLE public.employees DROP CONSTRAINT employees_email_key;
ALTER TABLE public.employees ADD CONSTRAINT employees_tenant_employee_code_key UNIQUE (tenant_id, employee_code);
ALTER TABLE public.employees ADD CONSTRAINT employees_tenant_email_key UNIQUE (tenant_id, email);

ALTER TABLE public.contracts DROP CONSTRAINT contracts_contract_number_key;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_tenant_contract_number_key UNIQUE (tenant_id, contract_number);

ALTER TABLE public.time_off_types DROP CONSTRAINT time_off_types_name_key;
ALTER TABLE public.time_off_types DROP CONSTRAINT time_off_types_code_key;
ALTER TABLE public.time_off_types ADD CONSTRAINT time_off_types_tenant_name_key UNIQUE (tenant_id, name);
ALTER TABLE public.time_off_types ADD CONSTRAINT time_off_types_tenant_code_key UNIQUE (tenant_id, code);

ALTER TABLE public.salary_structures DROP CONSTRAINT salary_structures_code_key;
ALTER TABLE public.salary_structures ADD CONSTRAINT salary_structures_tenant_code_key UNIQUE (tenant_id, code);

-- -----------------------------------------------------------------------------
-- INDEXES for tenant-filtered queries (every controller/service query will
-- filter on tenant_id first)
-- -----------------------------------------------------------------------------
CREATE INDEX idx_profiles_tenant              ON public.profiles(tenant_id);
CREATE INDEX idx_user_roles_tenant            ON public.user_roles(tenant_id);
CREATE INDEX idx_departments_tenant           ON public.departments(tenant_id);
CREATE INDEX idx_job_positions_tenant         ON public.job_positions(tenant_id);
CREATE INDEX idx_working_schedules_tenant     ON public.working_schedules(tenant_id);
CREATE INDEX idx_employees_tenant             ON public.employees(tenant_id);
CREATE INDEX idx_contracts_tenant             ON public.contracts(tenant_id);
CREATE INDEX idx_time_off_types_tenant        ON public.time_off_types(tenant_id);
CREATE INDEX idx_time_off_allocations_tenant  ON public.time_off_allocations(tenant_id);
CREATE INDEX idx_time_off_requests_tenant     ON public.time_off_requests(tenant_id);
CREATE INDEX idx_time_off_requests_recipient  ON public.time_off_requests(recipient_user_id);
CREATE INDEX idx_attendance_tenant            ON public.attendance(tenant_id);
CREATE INDEX idx_salary_structures_tenant     ON public.salary_structures(tenant_id);
CREATE INDEX idx_payruns_tenant               ON public.payruns(tenant_id);
CREATE INDEX idx_payslips_tenant              ON public.payslips(tenant_id);

-- -----------------------------------------------------------------------------
-- COMMENTS
-- -----------------------------------------------------------------------------
COMMENT ON TABLE public.tenants IS
  'Top-level SaaS customer/account. Every HR/payroll/time-off table is scoped to a tenant_id.';

COMMENT ON TABLE public.legal_entities IS
  'A registered company/subsidiary under a tenant. MVP: exactly one per tenant, auto-created at signup.';

COMMENT ON COLUMN public.time_off_requests.recipient_user_id IS
  'The specific approver this leave request was addressed to (defaults to the employee''s manager). HR/Admin can always approve/refuse as a fallback regardless of this value.';
