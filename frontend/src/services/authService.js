/**
 * Auth Service
 * ────────────
 * Real backend authentication. Calls the PeoplePay360 Express API.
 *
 * Backend endpoints consumed:
 *   POST /api/auth/login   → { success, data: { user, session, profile, roles, permissions } }
 *   POST /api/auth/logout  → { success }
 *   GET  /api/auth/me      → { success, data: { id, email, profile, roles, permissions, employee } }
 */

import api from './api';

// ─── Token key names in localStorage ─────────────────────────────────────────
const TOKEN_KEY = 'pp360_token';
const USER_KEY  = 'pp360_user';

// ─── Role slug → display name mapping ────────────────────────────────────────
const ROLE_DISPLAY = {
  admin:              'Admin',
  hr_payroll_manager: 'HR Payroll Manager',
  hr_payroll_user:    'HR Payroll User',
  hr_manager:         'HR Manager',
  employee:           'Employee',
};

/**
 * Map backend user response → frontend user object
 */
function mapUser(data) {
  const slug = data.roles?.[0] ?? 'employee';
  return {
    id:          data.id ?? data.user?.id,
    email:       data.email ?? data.user?.email,
    name:        data.profile
      ? `${data.profile.first_name ?? ''} ${data.profile.last_name ?? ''}`.trim()
      : (data.email ?? ''),
    role:        ROLE_DISPLAY[slug] ?? slug,
    roleSlug:    slug,
    roles:       data.roles ?? [],
    permissions: data.permissions ?? [],
    employee:    data.employee ?? null,
    tenantId:    data.tenantId ?? data.profile?.tenant_id ?? null,
    avatar:      data.profile?.avatar_url ?? null,
  };
}

/**
 * Login with email + password.
 * Stores token and user in localStorage for session persistence.
 */
export async function login(email, password) {
  const response = await api.post('/auth/login', { email, password });
  const { data } = response.data; // { user, session, profile, roles, permissions }

  const token = data.session?.access_token;
  if (!token) throw new Error('No access token received from server');

  localStorage.setItem(TOKEN_KEY, token);

  const user = mapUser({ ...data.user, ...data, profile: data.profile });
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  return { user, token };
}

/**
 * Logout current user.
 * Clears local session regardless of backend response.
 */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Always clear local session even if backend call fails
  } finally {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

/**
 * Get the currently authenticated user.
 * Called on app mount to restore session.
 * Returns null if no token or token is invalid.
 */
export async function getCurrentUser() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  try {
    const response = await api.get('/auth/me');
    const data = response.data?.data ?? response.data;
    const user = mapUser(data);
    // Refresh cached user
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch (err) {
    // 401 is handled by api.js interceptor (clears token + redirects)
    // For other errors return cached user if available
    const cached = localStorage.getItem(USER_KEY);
    if (cached) {
      try { return JSON.parse(cached); } catch { /* ignore */ }
    }
    return null;
  }
}

// ─── Role constants (matches App.jsx role strings) ────────────────────────────
export const ALL_ROLES = [
  'Employee',
  'HR Manager',
  'HR Payroll User',
  'HR Payroll Manager',
  'Admin',
];

// ─── DEV-ONLY: role switcher (no-op in production) ───────────────────────────
export function devSwitchRole() {
  // No-op — real backend enforces roles
}
