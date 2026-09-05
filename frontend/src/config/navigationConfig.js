/**
 * Navigation Configuration
 * ────────────────────────
 * Single source of truth for all sidebar navigation items.
 *
 * Each item defines:
 *   label        — display text
 *   path         — route path
 *   icon         — Lucide React component
 *   group        — section label shown in sidebar (null = no group header)
 *   allowedRoles — which roles can see this item (empty array = all roles)
 *   end          — if true, only active when path matches exactly (for /dashboard)
 *
 * To add a new nav item, add it here — do NOT add hardcoded nav in Sidebar.jsx.
 */

import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  CalendarDays,
  CalendarClock,
  FileSignature,
  Receipt,
  FileText,
  Layers,
  BookOpen,
  BarChart3,
  UserCircle,
} from 'lucide-react';

/** All defined roles — keep in sync with authService.ALL_ROLES */
const ROLE = {
  EMPLOYEE: 'Employee',
  HR_MANAGER: 'HR Manager',
  HR_PAYROLL_USER: 'HR Payroll User',
  HR_PAYROLL_MANAGER: 'HR Payroll Manager',
  ADMIN: 'Admin',
};

const ALL_ROLES = Object.values(ROLE);
const HR_AND_ABOVE = [ROLE.HR_MANAGER, ROLE.HR_PAYROLL_USER, ROLE.HR_PAYROLL_MANAGER, ROLE.ADMIN];
const PAYROLL_ROLES = [ROLE.HR_PAYROLL_USER, ROLE.HR_PAYROLL_MANAGER, ROLE.ADMIN];
const PAYROLL_MANAGER_ROLES = [ROLE.HR_PAYROLL_MANAGER, ROLE.ADMIN];
const HR_MANAGER_ROLES = [ROLE.HR_MANAGER, ROLE.HR_PAYROLL_MANAGER, ROLE.ADMIN];

/**
 * Navigation items — ordered as they appear in the sidebar.
 */
export const navigationItems = [
  // ── Top-level (no group) ────────────────────────────────────────────────
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    group: null,
    allowedRoles: ALL_ROLES,
    end: true,
  },

  // ── Employee self-service (visible only to Employee role) ───────────────
  {
    label: 'My Profile',
    path: '/my-profile',
    icon: UserCircle,
    group: 'MY WORKSPACE',
    allowedRoles: [ROLE.EMPLOYEE],
  },
  {
    label: 'My Attendance',
    path: '/my-attendance',
    icon: ClipboardCheck,
    group: 'MY WORKSPACE',
    allowedRoles: [ROLE.EMPLOYEE],
  },
  {
    label: 'My Time Off',
    path: '/my-time-off',
    icon: CalendarDays,
    group: 'MY WORKSPACE',
    allowedRoles: [ROLE.EMPLOYEE],
  },
  {
    label: 'My Payslips',
    path: '/my-payslips',
    icon: FileText,
    group: 'MY WORKSPACE',
    allowedRoles: [ROLE.EMPLOYEE],
  },

  // ── People ──────────────────────────────────────────────────────────────
  {
    label: 'Employees',
    path: '/employees',
    icon: Users,
    group: 'PEOPLE',
    allowedRoles: HR_AND_ABOVE,
  },
  {
    label: 'Contracts',
    path: '/contracts',
    icon: FileSignature,
    group: 'PEOPLE',
    allowedRoles: HR_MANAGER_ROLES,
  },

  // ── Attendance ──────────────────────────────────────────────────────────
  {
    label: 'Attendance',
    path: '/attendance',
    icon: ClipboardCheck,
    group: 'ATTENDANCE',
    allowedRoles: HR_AND_ABOVE,
  },

  // ── Time Off ────────────────────────────────────────────────────────────
  {
    label: 'Requests',
    path: '/time-off/requests',
    icon: CalendarDays,
    group: 'TIME OFF',
    allowedRoles: HR_AND_ABOVE,
  },
  {
    label: 'Allocations',
    path: '/time-off/allocations',
    icon: CalendarClock,
    group: 'TIME OFF',
    allowedRoles: HR_MANAGER_ROLES,
  },

  // ── Payroll ─────────────────────────────────────────────────────────────
  {
    label: 'Payruns',
    path: '/payroll',
    icon: Receipt,
    group: 'PAYROLL',
    allowedRoles: PAYROLL_ROLES,
  },
  {
    label: 'Payslips',
    path: '/payslips',
    icon: FileText,
    group: 'PAYROLL',
    allowedRoles: PAYROLL_ROLES,
  },
  {
    label: 'Salary Structures',
    path: '/salary-structures',
    icon: Layers,
    group: 'PAYROLL',
    allowedRoles: PAYROLL_MANAGER_ROLES,
  },
  {
    label: 'Salary Rules',
    path: '/salary-rules',
    icon: BookOpen,
    group: 'PAYROLL',
    allowedRoles: PAYROLL_MANAGER_ROLES,
  },

  // ── Reports ─────────────────────────────────────────────────────────────
  {
    label: 'Reports',
    path: '/reports',
    icon: BarChart3,
    group: 'REPORTS',
    allowedRoles: HR_AND_ABOVE,
  },
];

/**
 * Filter navigation items by the current user's role.
 * @param {string|null} role
 * @returns {typeof navigationItems}
 */
export function getNavItemsForRole(role) {
  if (!role) return [];
  return navigationItems.filter(
    (item) => item.allowedRoles.length === 0 || item.allowedRoles.includes(role)
  );
}

/**
 * Get all distinct groups present in a filtered nav list (preserving order).
 * @param {typeof navigationItems} items
 * @returns {(string|null)[]}
 */
export function getNavGroups(items) {
  const seen = new Set();
  const groups = [];
  for (const item of items) {
    if (!seen.has(item.group)) {
      seen.add(item.group);
      groups.push(item.group);
    }
  }
  return groups;
}

/**
 * Route-to-breadcrumb mapping.
 * Used by MainLayout to derive breadcrumb items from the current pathname.
 */
export const routeBreadcrumbs = {
  '/dashboard': [{ name: 'Dashboard', href: '/dashboard' }],
  '/employees': [{ name: 'Employees', href: '/employees' }],
  '/contracts': [{ name: 'Contracts', href: '/contracts' }],
  '/attendance': [{ name: 'Attendance', href: '/attendance' }],
  '/time-off': [{ name: 'Time Off', href: '/time-off' }],
  '/time-off/requests': [
    { name: 'Time Off', href: '/time-off' },
    { name: 'Requests', href: '/time-off/requests' },
  ],
  '/time-off/allocations': [
    { name: 'Time Off', href: '/time-off' },
    { name: 'Allocations', href: '/time-off/allocations' },
  ],
  '/payroll': [{ name: 'Payroll', href: '/payroll' }],
  '/payslips': [{ name: 'Payslips', href: '/payslips' }],
  '/salary-structures': [{ name: 'Salary Structures', href: '/salary-structures' }],
  '/salary-rules': [{ name: 'Salary Rules', href: '/salary-rules' }],
  '/reports': [{ name: 'Reports', href: '/reports' }],
  '/my-profile': [{ name: 'My Profile', href: '/my-profile' }],
  '/my-attendance': [{ name: 'My Attendance', href: '/my-attendance' }],
  '/my-time-off': [{ name: 'My Time Off', href: '/my-time-off' }],
  '/my-payslips': [{ name: 'My Payslips', href: '/my-payslips' }],
  '/access-denied': [{ name: 'Access Denied', href: '/access-denied' }],
};
