/**
 * RoleGuard
 * ─────────
 * Checks whether the current user's role is in the allowedRoles list.
 * If not, redirects to /access-denied.
 *
 * IMPORTANT: Frontend authorization is for UX/navigation only.
 * The backend MUST enforce actual authorization on every API endpoint.
 *
 * Usage:
 *   <RoleGuard allowedRoles={['Admin', 'HR Manager']}>
 *     <SomePage />
 *   </RoleGuard>
 */

import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RoleGuard({ allowedRoles, children }) {
  const { hasPermission, isAuthenticated } = useAuth();

  // Not authenticated — ProtectedRoute should have already handled this,
  // but guard defensively here too.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // allowedRoles empty means all authenticated users are allowed
  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }

  if (!hasPermission(allowedRoles)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}
