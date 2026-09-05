-- =============================================================================
-- Migration: 002_auth_rbac_schema.sql
-- Description: Core Authentication & Role-Based Access Control (RBAC) schema
-- Project: PeoplePay360 HR & Payroll
-- =============================================================================

-- 1. Profiles Table (Application-level user profile mapping to Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY, -- Maps directly to auth.users.id
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- Auto-update timestamp trigger for profiles
CREATE OR REPLACE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 2. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,        -- e.g. "HR Payroll Manager"
    slug VARCHAR(50) NOT NULL UNIQUE,        -- e.g. "hr_payroll_manager"
    description TEXT,
    is_system BOOLEAN DEFAULT TRUE NOT NULL, -- System roles cannot be deleted
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_roles_slug ON roles(slug);

CREATE OR REPLACE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 3. Permissions Table (Module-based granular permissions)
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL,             -- e.g. "payroll", "employee", "salary_structure"
    action VARCHAR(50) NOT NULL,             -- e.g. "read", "create", "process", "manage"
    slug VARCHAR(100) NOT NULL UNIQUE,       -- e.g. "payroll:process", "salary_structure:manage"
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_permissions_slug ON permissions(slug);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

-- 4. Role Permissions Junction Table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- 5. User Roles Junction Table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- =============================================================================
-- Row Level Security (RLS) Enablement & Policies
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile; service role / authenticated can query
CREATE POLICY "Allow users to read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Allow users to update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Roles and Permissions: Read access for all authenticated users
CREATE POLICY "Allow authenticated read roles" ON roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read permissions" ON permissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read role_permissions" ON role_permissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read user_roles" ON user_roles
    FOR SELECT TO authenticated USING (true);
