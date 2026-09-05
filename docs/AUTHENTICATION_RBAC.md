# PeoplePay360 - Authentication & Role-Based Access Control (RBAC)

This document provides a comprehensive guide to the Authentication, User Mapping, and Role-Based Access Control architecture in PeoplePay360.

---

## 1. Architecture Overview

Authentication and authorization in PeoplePay360 are decoupled:
1. **Authentication (Supabase Auth)**:
   - Supabase handles identity, password encryption, session lifecycle, and JWT generation.
   - Application database **never** stores or duplicates user passwords.
2. **Profile Mapping (`profiles`)**:
   - Each authenticated user is mapped 1:1 via their Supabase `auth.users(id)` to an application-level `profiles` record.
3. **Role-Based Access Control (RBAC)**:
   - Users are assigned one or more **Roles** (`user_roles`).
   - Roles are granted granular **Permissions** (`role_permissions`).
   - Requests are authorized at route level using declarative middleware.

---

## 2. System Roles

PeoplePay360 defines 5 canonical system roles:

| Role | Slug | Description | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | Full system administrator | Superuser access to all modules, roles, and settings |
| **HR Payroll Manager** | `hr_payroll_manager` | Head of HR & Payroll operations | Full HR + Full Payroll, Salary Structures & Calculation Rules |
| **HR Payroll User** | `hr_payroll_user` | Payroll processing specialist | Payroll calculation, payslip generation, read-only HR & structures (No structure management) |
| **HR Manager** | `hr_manager` | Human Resources specialist | Full HR management (Employee, Attendance, Leave, Contract). **No Payroll access** |
| **Employee** | `employee` | Standard employee | Self-service portal (own profile, attendance, leaves, payslips) |

---

## 3. Granular Module Permissions

Permissions follow the format `<module>:<action>` across 9 modules:

### Module Matrix:
- **`employee`**: `employee:read`, `employee:read_own`, `employee:create`, `employee:update`, `employee:delete`
- **`attendance`**: `attendance:read`, `attendance:read_own`, `attendance:create`, `attendance:update`, `attendance:delete`, `attendance:approve`
- **`leave`**: `leave:read`, `leave:read_own`, `leave:create`, `leave:update`, `leave:delete`, `leave:approve`
- **`contract`**: `contract:read`, `contract:read_own`, `contract:create`, `contract:update`, `contract:delete`
- **`payroll`**: `payroll:read`, `payroll:process`, `payroll:approve`, `payroll:lock`, `payroll:export`
- **`payslip`**: `payslip:read_own`, `payslip:read_all`, `payslip:generate`, `payslip:download`
- **`salary_structure`**: `salary_structure:read`, `salary_structure:manage`
- **`salary_rule`**: `salary_rule:read`, `salary_rule:manage`
- **`admin`**: `admin:all`, `admin:users:manage`, `admin:roles:manage`, `admin:settings:manage`

---

## 4. RBAC Permission Matrix

| Module / Permission | Employee | HR Manager | HR Payroll User | HR Payroll Manager | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Employee (Read Own)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Employee (Full HR CRUD)** | ❌ | ✅ | ❌ (Read only) | ✅ | ✅ |
| **Attendance & Leave Management** | ❌ (Self only) | ✅ | ❌ (Read only) | ✅ | ✅ |
| **Contract Management** | ❌ (Self only) | ✅ | ❌ (Read only) | ✅ | ✅ |
| **Payroll Processing (`payroll:process`)** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Payroll Approval & Lock** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Payslip (Read Own)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Payslips (All & Generate)** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Salary Structure (Read)** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Salary Structure (Manage)** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Salary Rule (Manage)** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **System Admin Settings** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 5. Middleware Usage

### 5.1 `requireAuth()`
Validates the Bearer token in the `Authorization` header. Attaches `req.user` with `{ id, email, profile, roles, permissions }`.
Returns `401 Unauthorized` if token is missing, invalid, or expired.

```javascript
const { requireAuth } = require('../middleware');

router.get('/profile', requireAuth(), (req, res) => {
  res.json({ user: req.user });
});
```

### 5.2 `requireRole(...allowedRoles)`
Enforces role-level access. Checks if the user holds at least one of the specified roles (Admin passes automatically).
Returns `403 Forbidden` if unauthorized.

```javascript
const { requireAuth, requireRole } = require('../middleware');

// Accessible by HR Manager or HR Payroll Manager
router.post('/departments', requireAuth(), requireRole('hr_manager', 'hr_payroll_manager'), (req, res) => {
  // ...
});
```

### 5.3 `requirePermission(...requiredPermissions)`
Enforces granular permission-level access. Checks if the user holds all specified permissions (Admin passes automatically).
Returns `403 Forbidden` if unauthorized.

```javascript
const { requireAuth, requirePermission } = require('../middleware');

// Accessible only if user holds salary structure management permission
router.post('/salary-structures', requireAuth(), requirePermission('salary_structure:manage'), (req, res) => {
  // ...
});
```

---

## 6. Authentication API Endpoints

### 6.1 Register User
`POST /api/auth/signup`
```json
// Request
{
  "email": "sarah.hr@company.com",
  "password": "SecurePassword123!",
  "firstName": "Sarah",
  "lastName": "Jenkins",
  "role": "hr_manager"
}

// Response (201 Created)
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "sarah.hr@company.com" },
    "profile": { "first_name": "Sarah", "last_name": "Jenkins" },
    "roles": ["hr_manager"],
    "permissions": ["employee:read", "employee:create", ...]
  },
  "message": "User registered successfully"
}
```

### 6.2 Login User
`POST /api/auth/login`
```json
// Request
{
  "email": "sarah.hr@company.com",
  "password": "SecurePassword123!"
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "session": { "access_token": "eyJhbGciOi..." },
    "profile": { "first_name": "Sarah", "last_name": "Jenkins" },
    "roles": ["hr_manager"],
    "permissions": ["employee:read", "employee:create", ...]
  },
  "message": "Login successful"
}
```

### 6.3 Current User Info
`GET /api/auth/me`
Header: `Authorization: Bearer <token>`
```json
// Response (200 OK)
{
  "success": true,
  "data": {
    "id": "...",
    "email": "sarah.hr@company.com",
    "profile": { "first_name": "Sarah", "last_name": "Jenkins", "is_active": true },
    "roles": ["hr_manager"],
    "permissions": ["employee:read", "employee:create", "leave:approve", ...]
  },
  "message": "Current authenticated user profile retrieved successfully"
}
```

---

## 7. Error Responses

### 401 Unauthorized (Missing / Invalid Token)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: Missing or malformed Bearer token"
  }
}
```

### 403 Forbidden (Insufficient Role or Permissions)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Forbidden: Insufficient permissions. Missing: [salary_structure:manage]"
  }
}
```
