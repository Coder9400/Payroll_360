/**
 * Auth Service
 * -----------
 * Stubs for backend auth API endpoints.
 * Replace mock implementations with real API calls when the backend is ready.
 *
 * Expected backend endpoints:
 *   POST /auth/login   → { token, user }
 *   POST /auth/logout  → 204
 *   GET  /auth/me      → user object
 */

import api from './api';

// ─── DEV-ONLY MOCK USERS ─────────────────────────────────────────────────────
// Remove or replace this block when connecting to the real backend.
const DEV_MOCK_USERS = [
  {
    id: 'usr-001',
    name: 'Alice Johnson',
    email: 'alice@peoplepay.dev',
    password: 'dev123',
    role: 'Employee',
    avatar: null,
    department: 'Engineering',
    jobTitle: 'Software Engineer',
  },
  {
    id: 'usr-002',
    name: 'Bob Martinez',
    email: 'bob@peoplepay.dev',
    password: 'dev123',
    role: 'HR Manager',
    avatar: null,
    department: 'Human Resources',
    jobTitle: 'HR Manager',
  },
  {
    id: 'usr-003',
    name: 'Carol Singh',
    email: 'carol@peoplepay.dev',
    password: 'dev123',
    role: 'HR Payroll User',
    avatar: null,
    department: 'Finance',
    jobTitle: 'Payroll Specialist',
  },
  {
    id: 'usr-004',
    name: 'David Chen',
    email: 'david@peoplepay.dev',
    password: 'dev123',
    role: 'HR Payroll Manager',
    avatar: null,
    department: 'Finance',
    jobTitle: 'Payroll Manager',
  },
  {
    id: 'usr-005',
    name: 'Eva Williams',
    email: 'eva@peoplepay.dev',
    password: 'dev123',
    role: 'Admin',
    avatar: null,
    department: 'IT',
    jobTitle: 'System Administrator',
  },
];
// ─────────────────────────────────────────────────────────────────────────────

const IS_DEV = import.meta.env.DEV;

/**
 * Login with email + password.
 * In production, this will POST /auth/login and store the JWT token.
 */
export async function login(email, password) {
  if (IS_DEV) {
    // DEV: find mock user
    const user = DEV_MOCK_USERS.find(
      (u) => u.email === email && u.password === password
    );
    if (!user) {
      throw new Error('Invalid credentials. Use any dev user with password: dev123');
    }
    const { password: _pw, ...safeUser } = user;
    localStorage.setItem('dev_current_user', JSON.stringify(safeUser));
    return { user: safeUser, token: 'dev-token' };
  }

  // PRODUCTION: replace mock with real API call
  const response = await api.post('/auth/login', { email, password });
  const { token, user } = response.data;
  localStorage.setItem('token', token);
  return { user, token };
}

/**
 * Logout the current user.
 */
export async function logout() {
  if (IS_DEV) {
    localStorage.removeItem('dev_current_user');
    return;
  }
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('token');
  }
}

/**
 * Get the currently authenticated user.
 * In production, this will GET /auth/me using the stored token.
 */
export async function getCurrentUser() {
  if (IS_DEV) {
    const stored = localStorage.getItem('dev_current_user');
    return stored ? JSON.parse(stored) : null;
  }

  // PRODUCTION: replace mock with real API call
  const token = localStorage.getItem('token');
  if (!token) return null;
  const response = await api.get('/auth/me');
  return response.data;
}

/**
 * DEV-ONLY: Switch to a different role without re-authenticating.
 * This will be removed when connecting to the real backend.
 */
export function devSwitchRole(role) {
  if (!IS_DEV) return;
  const user = DEV_MOCK_USERS.find((u) => u.role === role);
  if (!user) return;
  const { password: _pw, ...safeUser } = user;
  localStorage.setItem('dev_current_user', JSON.stringify(safeUser));
  return safeUser;
}

export const DEV_USERS = IS_DEV ? DEV_MOCK_USERS.map(({ password: _pw, ...u }) => u) : [];
export const ALL_ROLES = ['Employee', 'HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Admin'];
