/**
 * Sidebar
 * ───────
 * Role-aware sidebar navigation.
 * Navigation items are sourced from navigationConfig.js — do NOT add items here.
 *
 * DEV-ONLY: A role switcher panel is shown at the bottom when import.meta.env.DEV is true.
 * Remove or disable it by setting DEV=false in production env files.
 */

import * as React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { getNavItemsForRole, getNavGroups } from '../../config/navigationConfig';
import { useAuth } from '../../context/AuthContext';
import { X, ChevronDown, Settings2 } from 'lucide-react';

const IS_DEV = import.meta.env.DEV;

export function Sidebar({ isOpen, setIsOpen }) {
  const { userRole, devChangeRole, ALL_ROLES } = useAuth();
  const [devPanelOpen, setDevPanelOpen] = React.useState(false);

  const filteredItems = getNavItemsForRole(userRole);
  const groups = getNavGroups(filteredItems);

  return (
    <>
      {/* ── Mobile overlay ──────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar panel ───────────────────────────────────────────────── */}
      <aside
        id="main-sidebar"
        aria-label="Main navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:inset-auto lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo + close button */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-gray-100">
          <Link
            to="/dashboard"
            className="flex items-center gap-2"
            onClick={() => setIsOpen(false)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <span className="text-xs font-bold text-white">PP</span>
            </div>
            <span className="text-base font-bold text-gray-900 tracking-tight">
              PeoplePay<span className="text-primary-600">360</span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close sidebar"
            className="lg:hidden -mr-1 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Sidebar navigation">
          {groups.map((group) => {
            const items = filteredItems.filter((item) => item.group === group);
            return (
              <div key={group ?? '__top__'}>
                {/* Section label */}
                {group && (
                  <p className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 first:mt-0">
                    {group}
                  </p>
                )}
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-primary-50 text-primary-700 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            isActive
                              ? 'text-primary-600'
                              : 'text-gray-400 group-hover:text-gray-600'
                          )}
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>
                        {isActive && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-500" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="shrink-0 border-t border-gray-100">
          {/* Settings link */}
          <div className="px-3 py-2">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Settings2
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
                    )}
                    aria-hidden="true"
                  />
                  <span>Settings</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-500" />
                  )}
                </>
              )}
            </NavLink>
          </div>

          {/* ── DEV-ONLY: Role Switcher ────────────────────────────────── */}
          {IS_DEV && ALL_ROLES && (
            <div className="border-t border-dashed border-amber-200 bg-amber-50/50 px-3 py-2">
              <button
                type="button"
                id="dev-role-switcher-toggle"
                aria-expanded={devPanelOpen}
                onClick={() => setDevPanelOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-amber-400 text-[8px] font-bold text-white">
                    D
                  </span>
                  DEV · {userRole}
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    devPanelOpen && 'rotate-180'
                  )}
                />
              </button>

              {devPanelOpen && (
                <div className="mt-1 space-y-0.5 px-1">
                  <p className="mb-1 text-[10px] text-amber-600/70">Switch role:</p>
                  {ALL_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      id={`dev-switch-${role.toLowerCase().replace(/\s/g, '-')}`}
                      onClick={() => {
                        devChangeRole(role);
                        setDevPanelOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded px-2 py-1 text-xs transition-colors',
                        userRole === role
                          ? 'bg-amber-200 text-amber-800 font-semibold'
                          : 'text-amber-700 hover:bg-amber-100'
                      )}
                    >
                      {userRole === role && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      )}
                      <span className={userRole === role ? '' : 'ml-3'}>{role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* ── END DEV-ONLY ──────────────────────────────────────────── */}
        </div>
      </aside>
    </>
  );
}
