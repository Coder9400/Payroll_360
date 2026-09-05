-- =============================================================================
-- Seed: 002_roles_and_permissions_seed.sql
-- Description: System Roles, Module Permissions & RBAC Mapping Seed
-- Project: PeoplePay360 HR & Payroll
-- =============================================================================

-- 1. Insert System Roles
INSERT INTO roles (name, slug, description, is_system)
VALUES 
    ('Admin', 'admin', 'Full system access and administration privileges', true),
    ('HR Payroll Manager', 'hr_payroll_manager', 'Full HR and Payroll management, salary structures, and rule configurations', true),
    ('HR Payroll User', 'hr_payroll_user', 'Payroll calculation, processing, and payslip generation operations', true),
    ('HR Manager', 'hr_manager', 'Human Resources management, employee records, attendance, leaves, and contracts', true),
    ('Employee', 'employee', 'Standard employee portal access for self-service attendance, leaves, and payslips', true)
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 2. Insert Permissions for All 9 Modules
INSERT INTO permissions (module, action, slug, description)
VALUES
    -- Employee Module
    ('employee', 'read', 'employee:read', 'View employee records and directories'),
    ('employee', 'read_own', 'employee:read_own', 'View own employee profile'),
    ('employee', 'create', 'employee:create', 'Onboard new employees'),
    ('employee', 'update', 'employee:update', 'Update employee details'),
    ('employee', 'delete', 'employee:delete', 'Deactivate or remove employee records'),

    -- Attendance Module
    ('attendance', 'read', 'attendance:read', 'View company-wide attendance logs'),
    ('attendance', 'read_own', 'attendance:read_own', 'View own attendance history'),
    ('attendance', 'create', 'attendance:create', 'Clock in/out or submit attendance'),
    ('attendance', 'update', 'attendance:update', 'Edit attendance records'),
    ('attendance', 'delete', 'attendance:delete', 'Delete attendance records'),
    ('attendance', 'approve', 'attendance:approve', 'Approve attendance regularization requests'),

    -- Leave Module
    ('leave', 'read', 'leave:read', 'View company-wide leave requests and balances'),
    ('leave', 'read_own', 'leave:read_own', 'View own leave applications and balance'),
    ('leave', 'create', 'leave:create', 'Submit leave requests'),
    ('leave', 'update', 'leave:update', 'Edit leave requests'),
    ('leave', 'delete', 'leave:delete', 'Cancel or delete leave requests'),
    ('leave', 'approve', 'leave:approve', 'Approve or reject leave applications'),

    -- Contract Module
    ('contract', 'read', 'contract:read', 'View employee contracts and terms'),
    ('contract', 'read_own', 'contract:read_own', 'View own employment contract'),
    ('contract', 'create', 'contract:create', 'Draft new employment contracts'),
    ('contract', 'update', 'contract:update', 'Modify contract terms'),
    ('contract', 'delete', 'contract:delete', 'Terminate or archive contracts'),

    -- Payroll Module
    ('payroll', 'read', 'payroll:read', 'View payroll batches and calculation summaries'),
    ('payroll', 'process', 'payroll:process', 'Execute payroll calculation runs'),
    ('payroll', 'approve', 'payroll:approve', 'Approve final payroll calculations'),
    ('payroll', 'lock', 'payroll:lock', 'Lock and finalize payroll periods'),
    ('payroll', 'export', 'payroll:export', 'Export payroll summaries and bank dispatch files'),

    -- Payslip Module
    ('payslip', 'read_own', 'payslip:read_own', 'View and download own payslips'),
    ('payslip', 'read_all', 'payslip:read_all', 'View all employee payslips'),
    ('payslip', 'generate', 'payslip:generate', 'Generate individual and bulk payslips'),
    ('payslip', 'download', 'payslip:download', 'Download company-wide payslips'),

    -- Salary Structure Module
    ('salary_structure', 'read', 'salary_structure:read', 'View salary structure definitions and brackets'),
    ('salary_structure', 'manage', 'salary_structure:manage', 'Create, modify, and delete salary structures'),

    -- Salary Rule Module
    ('salary_rule', 'read', 'salary_rule:read', 'View salary calculation rules, allowances, and deduction rates'),
    ('salary_rule', 'manage', 'salary_rule:manage', 'Create, configure, and maintain salary calculation rules'),

    -- Admin Module
    ('admin', 'all', 'admin:all', 'Complete system-level administrative access'),
    ('admin', 'users', 'admin:users:manage', 'Manage user accounts and role assignments'),
    ('admin', 'roles', 'admin:roles:manage', 'Configure roles and permission policies'),
    ('admin', 'settings', 'admin:settings:manage', 'Configure organization-wide settings')
ON CONFLICT (slug) DO UPDATE 
SET description = EXCLUDED.description;

-- 3. Map Permissions to Roles

-- Helper block to map permissions dynamically
DO $$
DECLARE
    r_admin UUID;
    r_hr_payroll_mgr UUID;
    r_hr_payroll_usr UUID;
    r_hr_mgr UUID;
    r_employee UUID;
BEGIN
    SELECT id INTO r_admin FROM roles WHERE slug = 'admin';
    SELECT id INTO r_hr_payroll_mgr FROM roles WHERE slug = 'hr_payroll_manager';
    SELECT id INTO r_hr_payroll_usr FROM roles WHERE slug = 'hr_payroll_user';
    SELECT id INTO r_hr_mgr FROM roles WHERE slug = 'hr_manager';
    SELECT id INTO r_employee FROM roles WHERE slug = 'employee';

    -- Clear existing mappings for clean idempotent seed
    DELETE FROM role_permissions WHERE role_id IN (r_admin, r_hr_payroll_mgr, r_hr_payroll_usr, r_hr_mgr, r_employee);

    -- ADMIN: All Permissions
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_admin, id FROM permissions;

    -- HR PAYROLL MANAGER: HR + Payroll + Salary Structures & Rules
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_hr_payroll_mgr, id FROM permissions
    WHERE module IN ('employee', 'attendance', 'leave', 'contract', 'payroll', 'payslip', 'salary_structure', 'salary_rule');

    -- HR PAYROLL USER: Payroll operations & Payslips + Read-only HR & Read-only Structures (NO salary structure/rule management)
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_hr_payroll_usr, id FROM permissions
    WHERE slug IN (
        'payroll:read',
        'payroll:process',
        'payroll:export',
        'payslip:read_own',
        'payslip:read_all',
        'payslip:generate',
        'payslip:download',
        'employee:read',
        'attendance:read',
        'contract:read',
        'salary_structure:read',
        'salary_rule:read'
    );

    -- HR MANAGER: Full HR (Employee, Attendance, Leave, Contract) - NO PAYROLL, NO SALARY STRUCTURES/RULES
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_hr_mgr, id FROM permissions
    WHERE module IN ('employee', 'attendance', 'leave', 'contract')
       OR slug IN ('payslip:read_own');

    -- EMPLOYEE: Self-service only
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_employee, id FROM permissions
    WHERE slug IN (
        'employee:read_own',
        'attendance:read_own',
        'attendance:create',
        'leave:read_own',
        'leave:create',
        'contract:read_own',
        'payslip:read_own'
    );
END $$;
