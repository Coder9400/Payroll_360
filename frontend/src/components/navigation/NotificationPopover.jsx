/**
 * Notification Popover
 * ─────────────────────
 * Notification bell with unread badge and popover panel.
 * Shares state with the Notifications page via notificationsStore.
 *
 * When the backend notification API is ready, replace notificationsStore
 * with a real API call — the component interface will not need to change.
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, AlertCircle, Clock, Info, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  getNotifications,
  subscribeNotifications,
  markAllNotificationsRead,
  dismissNotification as dismissFromStore,
} from '../../data/notificationsStore';

const notifIcon = {
  success: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  warning: <AlertCircle className="h-4 w-4 text-amber-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
};

export function NotificationPopover() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState(getNotifications);
  const panelRef = React.useRef(null);

  // Stay in sync with the shared store (same data as Notifications page)
  React.useEffect(() => subscribeNotifications(setNotifications), []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function handleViewAll() {
    setIsOpen(false);
    navigate('/notifications');
  }

  // Close popover when clicking outside
  React.useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        id="notification-bell"
        type="button"
        aria-label="View notifications"
        aria-expanded={isOpen}
        className="relative -m-2.5 p-2.5 text-gray-500 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100"
        onClick={() => setIsOpen((v) => !v)}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-1">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-gray-500">
                <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                No notifications
              </li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    'group flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors',
                    !n.isRead && 'bg-primary-50/30'
                  )}
                >
                  <div className="mt-0.5 shrink-0">{notifIcon[n.type]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm font-medium text-gray-900', !n.isRead && 'font-semibold')}>
                        {n.title}
                      </p>
                      <button
                        type="button"
                        aria-label="Dismiss notification"
                        onClick={() => dismissFromStore(n.id)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.message}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {n.timestamp}
                      {!n.isRead && (
                        <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary-500 inline-block" />
                      )}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>

          {/* Footer — navigates to the full Notifications page */}
          <div className="border-t border-gray-100 px-4 py-2.5">
            <button
              type="button"
              className="w-full text-center text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
              onClick={handleViewAll}
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
