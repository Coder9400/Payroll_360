-- =============================================================================
-- Phase 4+5: Payroll Schema Migration
-- Migration: 005_payroll_schema.sql
-- Depends on: 003_hr_master_data.sql (employees, contracts)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SALARY STRUCTURES
-- Acts as a named container for salary rules (e.g. "Regular Salary")
-- -----------------------------------------------------------------------------
CREATE TABLE public.salary_structures (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(50)  NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- -----------------------------------------------------------------------------
-- SALARY RULES
-- One row per rule within a salary structure.
-- Rules execute in ascending sequence order.
-- computation_type: FIXED | PERCENTAGE | FORMULA
-- category: BASIC | ALLOWANCE | GROSS | DEDUCTION | CONTRIBUTION | NET
-- -----------------------------------------------------------------------------
CREATE TABLE public.salary_rules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_structure_id  UUID NOT NULL REFERENCES public.salary_structures(id) ON DELETE CASCADE,
  name                 VARCHAR(255) NOT NULL,
  code                 VARCHAR(50)  NOT NULL,
  category             VARCHAR(50)  NOT NULL DEFAULT 'ALLOWANCE',
  sequence             INTEGER      NOT NULL DEFAULT 10,
  computation_type     VARCHAR(20)  NOT NULL DEFAULT 'FIXED',
  -- For FIXED: store the amount here
  fixed_amount         NUMERIC(12,2),
  -- For PERCENTAGE: which context variable or rule-code to base on, and the %
  percentage_base      VARCHAR(100),
  percentage_value     NUMERIC(8,4),
  -- For FORMULA: arbitrary safe expression (e.g. "BASIC + HRA + TRANSPORT")
  formula              TEXT,
  -- Optional: condition expression. If false, rule produces 0
  condition_formula    TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  -- Code must be unique within a structure
  CONSTRAINT salary_rules_code_unique UNIQUE(salary_structure_id, code)
);

-- -----------------------------------------------------------------------------
-- PAYRUNS
-- Represents one payroll processing cycle for a date range.
-- status lifecycle: DRAFT → COMPUTING → COMPUTED → VALIDATED → PAID
-- -----------------------------------------------------------------------------
CREATE TABLE public.payruns (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(255) NOT NULL,
  salary_structure_id  UUID NOT NULL REFERENCES public.salary_structures(id) ON DELETE RESTRICT,
  period_start         DATE NOT NULL,
  period_end           DATE NOT NULL,
  status               VARCHAR(30)  NOT NULL DEFAULT 'DRAFT',
  total_employees      INTEGER      NOT NULL DEFAULT 0,
  total_gross          NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_net            NUMERIC(14,2) NOT NULL DEFAULT 0,
  computed_at          TIMESTAMPTZ,
  validated_at         TIMESTAMPTZ,
  paid_at              TIMESTAMPTZ,
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT payrun_dates_check CHECK (period_end >= period_start)
);

-- -----------------------------------------------------------------------------
-- PAYSLIPS
-- One per employee per payrun. UNIQUE constraint prevents duplicates.
-- Stores snapshot of contract_wage at time of computation for historical accuracy.
-- status: DRAFT → COMPUTED → VALIDATED → PAID
-- -----------------------------------------------------------------------------
CREATE TABLE public.payslips (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payrun_id            UUID NOT NULL REFERENCES public.payruns(id) ON DELETE CASCADE,
  employee_id          UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  contract_id          UUID NOT NULL REFERENCES public.contracts(id) ON DELETE RESTRICT,
  salary_structure_id  UUID NOT NULL REFERENCES public.salary_structures(id) ON DELETE RESTRICT,
  period_start         DATE NOT NULL,
  period_end           DATE NOT NULL,
  -- Attendance context (snapshot at computation time)
  working_days         INTEGER      NOT NULL DEFAULT 0,
  worked_days          NUMERIC(8,2) NOT NULL DEFAULT 0,
  paid_days            NUMERIC(8,2) NOT NULL DEFAULT 0,
  unpaid_leave_days    NUMERIC(8,2) NOT NULL DEFAULT 0,
  paid_leave_days      NUMERIC(8,2) NOT NULL DEFAULT 0,
  overtime_hours       NUMERIC(8,2) NOT NULL DEFAULT 0,
  -- Contract snapshot
  contract_wage        NUMERIC(12,2) NOT NULL,
  -- Computed totals (always 2 decimal places)
  gross_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  deduction_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Status and audit
  status               VARCHAR(30)  NOT NULL DEFAULT 'DRAFT',
  warnings             JSONB,
  computed_at          TIMESTAMPTZ,
  validated_at         TIMESTAMPTZ,
  paid_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  -- Duplicate protection: one payslip per employee per payrun
  CONSTRAINT payslip_unique_employee_payrun UNIQUE(payrun_id, employee_id)
);

-- -----------------------------------------------------------------------------
-- PAYSLIP LINES
-- One row per salary rule result per payslip.
-- Preserves full audit trail of how each payslip was computed.
-- salary_rule_id is nullable so historical lines survive if a rule is deleted.
-- -----------------------------------------------------------------------------
CREATE TABLE public.payslip_lines (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id     UUID NOT NULL REFERENCES public.payslips(id) ON DELETE CASCADE,
  salary_rule_id UUID REFERENCES public.salary_rules(id) ON DELETE SET NULL,
  code           VARCHAR(50)  NOT NULL,
  name           VARCHAR(255) NOT NULL,
  category       VARCHAR(50)  NOT NULL,
  sequence       INTEGER      NOT NULL,
  quantity       NUMERIC(10,4) NOT NULL DEFAULT 1,
  rate           NUMERIC(12,4) NOT NULL DEFAULT 0,
  amount         NUMERIC(12,2) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX idx_salary_rules_structure_seq ON public.salary_rules(salary_structure_id, sequence);
CREATE INDEX idx_salary_rules_active        ON public.salary_rules(salary_structure_id, is_active);

CREATE INDEX idx_payruns_status             ON public.payruns(status);
CREATE INDEX idx_payruns_period             ON public.payruns(period_start, period_end);
CREATE INDEX idx_payruns_structure          ON public.payruns(salary_structure_id);

CREATE INDEX idx_payslips_payrun            ON public.payslips(payrun_id);
CREATE INDEX idx_payslips_employee          ON public.payslips(employee_id);
CREATE INDEX idx_payslips_status            ON public.payslips(status);
CREATE INDEX idx_payslips_period            ON public.payslips(period_start, period_end);

CREATE INDEX idx_payslip_lines_payslip      ON public.payslip_lines(payslip_id, sequence);

-- -----------------------------------------------------------------------------
-- FOREIGN KEY: contracts → salary_structures
-- (column already exists as nullable from 003_hr_master_data.sql)
-- -----------------------------------------------------------------------------
ALTER TABLE public.contracts
  ADD CONSTRAINT fk_contract_salary_structure
  FOREIGN KEY (salary_structure_id) REFERENCES public.salary_structures(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- COMMENTS
-- -----------------------------------------------------------------------------
COMMENT ON TABLE public.salary_structures IS
  'Phase 4: Named containers for salary computation rules.';

COMMENT ON TABLE public.salary_rules IS
  'Phase 4: Ordered computation rules within a salary structure. Execution order is determined by the sequence column (ascending).';

COMMENT ON COLUMN public.salary_rules.computation_type IS
  'FIXED=static amount, PERCENTAGE=percent of another rule/context var, FORMULA=safe expression referencing context variables and prior rule codes.';

COMMENT ON TABLE public.payruns IS
  'Phase 5: One payroll processing cycle per period. status: DRAFT->COMPUTING->COMPUTED->VALIDATED->PAID.';

COMMENT ON TABLE public.payslips IS
  'Phase 5: One payslip per employee per payrun. contract_wage is snapshotted at computation time for historical accuracy.';

COMMENT ON TABLE public.payslip_lines IS
  'Phase 5: Audit trail of each salary rule result. Preserved even if the rule is later deleted (salary_rule_id nullable).';
