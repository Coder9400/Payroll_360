import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft, Home } from 'lucide-react';

export function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 ring-8 ring-red-50/50">
          <ShieldOff className="h-10 w-10 text-red-400" aria-hidden="true" />
        </div>

        {/* Status code */}
        <p className="text-sm font-semibold uppercase tracking-widest text-red-500 mb-2">
          403 — Forbidden
        </p>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Access Denied</h1>

        {/* Description */}
        <p className="text-base text-gray-500 mb-8">
          You don't have permission to access this page.
          <br />
          Contact your system administrator if you believe this is a mistake.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="access-denied-go-back"
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          <button
            id="access-denied-go-dashboard"
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
