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
  Bot,
  LayoutDashboard,
  Users,
  ClipboardCheck,
  CalendarDays,
  CalendarClock,
  CalendarOff,
  FileSignature,
  Receipt,
  FileText,
  Layers,
  BookOpen,
  BarChart3,
  UserCircle,
  Clock,
  Network,
  MapPin,
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
const PAYROLL_ROLES = [ROLE.HR_MANAGER, ROLE.HR_PAYROLL_USER, ROLE.HR_PAYROLL_MANAGER, ROLE.ADMIN];
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
  {
    label: 'Company Policies',
    path: '/policies',
    icon: BookOpen,
    group: 'MY WORKSPACE',
    allowedRoles: ALL_ROLES,
  },

  // ── People ──────────────────────────────────────────────────────────────
  {
    label: 'Organization',
    path: '/organization',
    icon: Network,
    group: 'PEOPLE',
    allowedRoles: HR_AND_ABOVE,
  },
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
  {
    label: 'Schedules',
    path: '/schedules',
    icon: Clock,
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
    end: true,
  },
  {
    label: 'Regularization',
    path: '/attendance/regularization',
    icon: CalendarClock,
    group: 'ATTENDANCE',
    allowedRoles: HR_AND_ABOVE,
  },
  {
    label: 'Map View',
    path: '/attendance/map',
    icon: MapPin,
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
  {
    label: 'Types',
    path: '/time-off/types',
    icon: CalendarOff,
    group: 'TIME OFF',
    allowedRoles: HR_MANAGER_ROLES,
  },

  // ── Payroll ─────────────────────────────────────────────────────────────
  {
    label: 'AI Payroll Agent',
    path: '/ai-agent',
    icon: Bot,
    group: 'PAYROLL',
    allowedRoles: PAYROLL_ROLES,
  },
  {
    label: 'Payruns',
    path: '/payruns',
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
  '/organization': [{ name: 'Organization', href: '/organization' }],
  '/employees': [{ name: 'Employees', href: '/employees' }],
  '/contracts': [{ name: 'Contracts', href: '/contracts' }],
  '/schedules': [{ name: 'Schedules', href: '/schedules' }],
  '/attendance': [{ name: 'Attendance', href: '/attendance' }],
  '/attendance/regularization': [
    { name: 'Attendance', href: '/attendance' },
    { name: 'Regularization', href: '/attendance/regularization' },
  ],
  '/attendance/map': [
    { name: 'Attendance', href: '/attendance' },
    { name: 'Map View', href: '/attendance/map' },
  ],
  '/time-off': [{ name: 'Time Off', href: '/time-off' }],
  '/time-off/requests': [
    { name: 'Time Off', href: '/time-off' },
    { name: 'Requests', href: '/time-off/requests' },
  ],
  '/time-off/allocations': [
    { name: 'Time Off', href: '/time-off' },
    { name: 'Allocations', href: '/time-off/allocations' },
  ],
  '/time-off/types': [
    { name: 'Time Off', href: '/time-off' },
    { name: 'Types', href: '/time-off/types' },
  ],
  '/payruns': [{ name: 'Payruns', href: '/payruns' }],
  '/payslips': [{ name: 'Payslips', href: '/payslips' }],
  '/salary-structures': [{ name: 'Salary Structures', href: '/salary-structures' }],
  '/salary-rules': [{ name: 'Salary Rules', href: '/salary-rules' }],
  '/reports': [{ name: 'Reports', href: '/reports' }],
  '/settings': [{ name: 'Settings', href: '/settings' }],
  '/notifications': [{ name: 'Notifications', href: '/notifications' }],
  '/my-profile': [{ name: 'My Profile', href: '/my-profile' }],
  '/my-attendance': [{ name: 'My Attendance', href: '/my-attendance' }],
  '/my-time-off': [{ name: 'My Time Off', href: '/my-time-off' }],
  '/my-payslips': [{ name: 'My Payslips', href: '/my-payslips' }],
  '/access-denied': [{ name: 'Access Denied', href: '/access-denied' }],
  '/policies': [{ name: 'Company Policies', href: '/policies' }],
};

/**
 * Dynamic breadcrumb patterns for parameterised routes.
 * Each entry is [prefixRegex, builder(pathname)].
 * MainLayout checks these when no exact match is found in routeBreadcrumbs.
 */
export const dynamicBreadcrumbs = [
  [
    /^\/policies\/[^/]+$/,
    () => [
      { name: 'Company Policies', href: '/policies' },
      { name: 'Policy Viewer', href: '#' },
    ],
  ],
  [
    /^\/employees\/[^/]+$/,
    () => [
      { name: 'Employees', href: '/employees' },
      { name: 'Employee Detail', href: '#' },
    ],
  ],
  [
    /^\/contracts\/[^/]+$/,
    () => [
      { name: 'Contracts', href: '/contracts' },
      { name: 'Contract Detail', href: '#' },
    ],
  ],
  [
    /^\/payruns\/[^/]+$/,
    () => [
      { name: 'Payruns', href: '/payruns' },
      { name: 'Payrun Detail', href: '#' },
    ],
  ],
  [
    /^\/payslips\/[^/]+$/,
    () => [
      { name: 'Payslips', href: '/payslips' },
      { name: 'Payslip Detail', href: '#' },
    ],
  ],
  [
    /^\/attendance\/[^/]+$/,
    () => [
      { name: 'Attendance', href: '/attendance' },
      { name: 'Employee Attendance', href: '#' },
    ],
  ],
  [
    /^\/time-off\/requests\/[^/]+$/,
    () => [
      { name: 'Time Off', href: '/time-off' },
      { name: 'Requests', href: '/time-off/requests' },
      { name: 'Request Detail', href: '#' },
    ],
  ],
];
