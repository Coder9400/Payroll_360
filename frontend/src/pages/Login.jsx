/**
 * Login Page
 * ──────────
 * Phase 02: Uses mock/dev authentication only.
 * When backend auth is ready, replace the submit handler to call the real API.
 * The component structure and routing do not need to change.
 *
 * Dev credentials (all use password: dev123):
 *   alice@peoplepay.dev    → Employee
 *   bob@peoplepay.dev      → HR Manager
 *   carol@peoplepay.dev    → HR Payroll User
 *   david@peoplepay.dev    → HR Payroll Manager
 *   eva@peoplepay.dev      → Admin
 */

import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const IS_DEV = import.meta.env.DEV;

const DEV_QUICK_LOGINS = [
  { label: 'Employee', email: 'alice@peoplepay.dev' },
  { label: 'HR Manager', email: 'bob@peoplepay.dev' },
  { label: 'HR Payroll User', email: 'carol@peoplepay.dev' },
  { label: 'HR Payroll Mgr', email: 'david@peoplepay.dev' },
  { label: 'Admin', email: 'eva@peoplepay.dev' },
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname ?? '/dashboard';

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message ?? 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  }

  function quickLogin(quickEmail) {
    setEmail(quickEmail);
    setPassword('dev123');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-100/60 px-8 py-10">
          {/* Logo + Branding */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-200">
              <span className="text-lg font-bold text-white">PP</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              PeoplePay<span className="text-primary-600">360</span>
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              HR & Payroll Operations Platform
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isLoading || !email || !password}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* DEV-ONLY: Quick login panel */}
          {IS_DEV && (
            <div className="mt-6 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                Dev Quick Login
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DEV_QUICK_LOGINS.map(({ label, email: qEmail }) => (
                  <button
                    key={qEmail}
                    type="button"
                    id={`dev-quick-login-${label.toLowerCase().replace(/\s/g, '-')}`}
                    onClick={() => quickLogin(qEmail)}
                    className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-amber-600">
                Password for all dev accounts: <strong>dev123</strong>
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} PeoplePay360. All rights reserved.
        </p>
      </div>
    </div>
  );
}
