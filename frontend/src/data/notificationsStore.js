const INITIAL = [
  {
    id: 'notif-001',
    type: 'success',
    title: 'Leave request approved',
    message: 'Your annual leave request for Oct 10–12 has been approved.',
    timestamp: '2 hours ago',
    isRead: false,
  },
  {
    id: 'notif-002',
    type: 'warning',
    title: 'Attendance regularization pending',
    message: 'You have 2 attendance entries requiring regularization.',
    timestamp: '5 hours ago',
    isRead: false,
  },
  {
    id: 'notif-003',
    type: 'error',
    title: 'Payroll validation warning',
    message: 'Payrun PAY-2026-09 has 3 warnings. Review before finalizing.',
    timestamp: 'Yesterday',
    isRead: true,
  },
  {
    id: 'notif-004',
    type: 'info',
    title: 'New payslip available',
    message: 'Your payslip for August 2026 is ready to download.',
    timestamp: '2 days ago',
    isRead: true,
  },
];

let notifications = INITIAL.map((n) => ({ ...n }));
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn(notifications));
}

export function getNotifications() {
  return notifications;
}

export function subscribeNotifications(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function markAllNotificationsRead() {
  notifications = notifications.map((n) => ({ ...n, isRead: true }));
  emit();
}

export function markNotificationRead(id) {
  notifications = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
  emit();
}

export function dismissNotification(id) {
  notifications = notifications.filter((n) => n.id !== id);
  emit();
}

/**
 * Add a new notification to the top of the list.
 * Called by any page/service that needs to push a real-time notification
 * to the HR/Admin bell (e.g. when an employee submits a leave request).
 *
 * @param {{ type: 'success'|'warning'|'error'|'info', title: string, message: string }} opts
 */
export function addNotification({ type = 'info', title, message }) {
  const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date();
  const timestamp = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' today';
  notifications = [{ id, type, title, message, timestamp, isRead: false }, ...notifications];
  emit();
}
