/**
 * Auth Context
 * ────────────
 * Central authentication and authorization state for the application.
 *
 * IMPORTANT: Frontend authorization is for UX/navigation only.
 * The backend MUST enforce actual authorization on every API endpoint.
 *
 * Architecture note:
 *   - Wrap <AuthProvider> around the entire app in main.jsx or App.jsx.
 *   - Use useAuth() hook anywhere in the component tree.
 *   - When backend auth is ready, replace the internals of AuthProvider
 *     (the login/logout/init logic) without changing any consumer component.
 */

import * as React from 'react';
import {
  login as authLogin,
  logout as authLogout,
  getCurrentUser,
  devSwitchRole,
  ALL_ROLES,
} from '../services/authService';

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // ── Init: restore session on mount ───────────────────────────────────────
  React.useEffect(() => {
    async function initAuth() {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      } catch {
        // Session invalid or expired — user must log in
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  // ── Auth actions ──────────────────────────────────────────────────────────
  async function login(email, password) {
    const { user } = await authLogin(email, password);
    setCurrentUser(user);
    setIsAuthenticated(true);
    return user;
  }

  async function logout() {
    await authLogout();
    setCurrentUser(null);
    setIsAuthenticated(false);
  }

  // ── Role/Permission helpers ───────────────────────────────────────────────
  /**
   * Returns true if the current user has the exact specified role.
   * @param {string} role
   */
  function hasRole(role) {
    return currentUser?.role === role;
  }

  /**
   * Returns true if the current user has ANY of the specified roles.
   * @param {string[]} roles
   */
  function hasAnyRole(roles) {
    return roles.includes(currentUser?.role);
  }

  /**
   * Returns true if the current user is an Admin (full access).
   */
  function isAdmin() {
    return currentUser?.role === 'Admin';
  }

  /**
   * Generic permission check — Admin always returns true.
   * Extend this function as backend permissions become defined.
   * @param {string[]} allowedRoles
   */
  function hasPermission(allowedRoles) {
    if (!currentUser) return false;
    if (currentUser.role === 'Admin') return true;
    return allowedRoles.includes(currentUser.role);
  }

  // ── DEV-ONLY: Role switcher ───────────────────────────────────────────────
  // This function will not exist in production builds where import.meta.env.DEV is false.
  function devChangeRole(role) {
    if (!import.meta.env.DEV) return;
    const user = devSwitchRole(role);
    if (user) setCurrentUser(user);
  }

  const value = {
    currentUser,
    userRole: currentUser?.role ?? null,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasRole,
    hasAnyRole,
    isAdmin,
    hasPermission,
    // DEV-ONLY — remove in production
    ...(import.meta.env.DEV ? { devChangeRole, ALL_ROLES } : {}),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth — consume the auth context in any component.
 * Throws if used outside <AuthProvider>.
 */
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
