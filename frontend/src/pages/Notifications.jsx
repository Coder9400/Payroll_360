import * as React from 'react';
import { Bell, CheckCircle, AlertCircle, Info, Clock } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import {
  getNotifications,
  subscribeNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  dismissNotification,
} from '../data/notificationsStore';

const icons = {
  success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
  warning: <AlertCircle className="h-5 w-5 text-amber-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
};

export function Notifications() {
  const [items, setItems] = React.useState(getNotifications());

  React.useEffect(() => subscribeNotifications(setItems), []);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Notifications" description="All alerts for your account." />
        {items.some((n) => !n.isRead) && (
          <Button variant="outline" onClick={markAllNotificationsRead}>Mark all read</Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
        {items.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-gray-500">
            <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            No notifications
          </div>
        ) : (
          items.map((n) => (
            <button
              type="button"
              key={n.id}
              onClick={() => markNotificationRead(n.id)}
              className={cn(
                'w-full text-left flex items-start gap-3 px-6 py-4 hover:bg-gray-50',
                !n.isRead && 'bg-primary-50/40'
              )}
            >
              <div className="mt-0.5">{icons[n.type]}</div>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm text-gray-900', !n.isRead && 'font-semibold')}>{n.title}</p>
                <p className="mt-0.5 text-sm text-gray-500">{n.message}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3" /> {n.timestamp}
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissNotification(n.id);
                }}
              >
                Dismiss
              </button>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
