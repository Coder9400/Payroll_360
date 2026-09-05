-- =============================================================
-- Migration 003: Employee & Organization Management Schema
-- Phase 3 - PeoplePay360
-- =============================================================

-- =============================================================
-- DEPARTMENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS departments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  head_id     UUID        REFERENCES employees(id) ON DELETE SET NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTE: head_id forward-references employees; the FK is added after
-- the employees table is created (see ALTER TABLE below).

-- =============================================================
-- POSITIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS positions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(120) NOT NULL,
  description   TEXT,
  department_id UUID        REFERENCES departments(id) ON DELETE CASCADE,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (title, department_id)
);

-- =============================================================
-- EMPLOYEES
-- =============================================================
CREATE TABLE IF NOT EXISTS employees (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity (may link to a Supabase auth user)
  user_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_number   VARCHAR(20) NOT NULL UNIQUE,

  -- Personal info
  first_name        VARCHAR(80)  NOT NULL,
  last_name         VARCHAR(80)  NOT NULL,
  email             VARCHAR(254) NOT NULL UNIQUE,
  phone             VARCHAR(30),

  -- Org structure
  department_id     UUID        REFERENCES departments(id) ON DELETE SET NULL,
  position_id       UUID        REFERENCES positions(id)  ON DELETE SET NULL,
  manager_id        UUID        REFERENCES employees(id)  ON DELETE SET NULL,

  -- Employment
  date_of_joining   DATE        NOT NULL,
  employment_status VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (employment_status IN ('active','inactive','on_leave','terminated','probation')),

  -- Bank details (required for payroll at run-time, nullable until payroll phase)
  bank_name         VARCHAR(120),
  bank_account_no   VARCHAR(50),
  bank_ifsc_code    VARCHAR(20),

  -- Audit
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- POST-CREATION: Add head_id FK on departments -> employees
-- (deferred because employees table did not exist at departments creation)
-- =============================================================
ALTER TABLE departments
  ADD CONSTRAINT fk_department_head
  FOREIGN KEY (head_id) REFERENCES employees(id) ON DELETE SET NULL;

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id  ON employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager_id   ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_status       ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_user_id      ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_department   ON positions(department_id);

-- =============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- ROW LEVEL SECURITY (Supabase)
-- =============================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees   ENABLE ROW LEVEL SECURITY;

-- Service-role bypasses RLS; all other read policies delegate
-- to application-level RBAC enforced in the Express middleware.

-- Allow service_role full access
CREATE POLICY "service_role_departments_all"
  ON departments FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_positions_all"
  ON positions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_employees_all"
  ON employees FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Authenticated users can read (application RBAC restricts further)
CREATE POLICY "authenticated_departments_read"
  ON departments FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "authenticated_positions_read"
  ON positions FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "authenticated_employees_read"
  ON employees FOR SELECT TO authenticated USING (TRUE);
