/**
 * TopNavbar
 * ─────────
 * Fixed top navigation bar with:
 *  - Mobile hamburger
 *  - Search field
 *  - Notification popover
 *  - User profile dropdown (name, role, My Profile, Settings, Logout)
 */

import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { NotificationPopover } from '../navigation/NotificationPopover';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

// Role → badge color
const roleBadgeColor = {
  Employee: 'bg-emerald-50 text-emerald-700',
  'HR Manager': 'bg-blue-50 text-blue-700',
  'HR Payroll User': 'bg-violet-50 text-violet-700',
  'HR Payroll Manager': 'bg-purple-50 text-purple-700',
  Admin: 'bg-rose-50 text-rose-700',
};

export function TopNavbar({ onMenuClick }) {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const profileRef = React.useRef(null);

  // Close profile dropdown on outside click
  React.useEffect(() => {
    if (!profileOpen) return;
    function handler(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  async function handleLogout() {
    setProfileOpen(false);
    await logout();
    navigate('/login', { replace: true });
  }

  // Initials for avatar fallback
  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-3 border-b border-gray-200 bg-white px-4 sm:gap-x-5 sm:px-6">
      {/* Mobile hamburger */}
      <button
        id="sidebar-toggle"
        type="button"
        aria-label="Open sidebar"
        className="-m-2 p-2 text-gray-600 hover:text-gray-900 transition-colors lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Vertical divider (mobile only) */}
      <div className="h-5 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

      {/* Search */}
      <div className="relative flex flex-1 items-center max-w-lg">
        <Search
          className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400"
          aria-hidden="true"
        />
        <input
          id="global-search"
          type="search"
          name="search"
          placeholder="Search..."
          className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/20 transition-all"
        />
      </div>

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Notifications */}
        <NotificationPopover />

        {/* Vertical divider */}
        <div className="hidden sm:block h-6 w-px bg-gray-200" aria-hidden="true" />

        {/* User profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            id="user-profile-menu"
            type="button"
            aria-expanded={profileOpen}
            aria-haspopup="true"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors"
          >
            {/* Avatar with initials fallback */}
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white ring-2 ring-primary-100">
              {initials}
            </div>
            {/* Name + Role (hidden on small screens) */}
            <div className="hidden sm:flex flex-col items-start leading-none">
              <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                {currentUser?.name ?? 'User'}
              </span>
              <span
                className={cn(
                  'mt-0.5 inline-flex rounded-sm px-1.5 py-px text-[10px] font-medium',
                  roleBadgeColor[userRole] ?? 'bg-gray-100 text-gray-600'
                )}
              >
                {userRole ?? 'Unknown'}
              </span>
            </div>
            <ChevronDown
              className={cn(
                'hidden sm:block h-3.5 w-3.5 text-gray-400 transition-transform',
                profileOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Dropdown menu */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 origin-top-right rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 z-50">
              {/* User info header */}
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">
                  {currentUser?.name ?? 'User'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{currentUser?.email ?? ''}</p>
                {currentUser?.jobTitle && (
                  <p className="text-xs text-gray-400 mt-0.5">{currentUser.jobTitle}</p>
                )}
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  to="/my-profile"
                  id="profile-menu-my-profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <User className="h-4 w-4 text-gray-400" />
                  My Profile
                </Link>
                <Link
                  to="/settings"
                  id="profile-menu-settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <Settings className="h-4 w-4 text-gray-400" />
                  Settings
                </Link>
              </div>

              <div className="border-t border-gray-100 py-1">
                <button
                  id="profile-menu-logout"
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
