import api from './api';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

export const settingsService = {
  async getSettings() {
    const res = await api.get('/settings');
    return unwrap(res);
  },

  async updateSettings(data) {
    const res = await api.patch('/settings', data);
    return unwrap(res);
  },
};

const HOLIDAY_KEY = 'pp360_holiday_calendar';

export function loadHolidayCalendar() {
  try {
    const raw = localStorage.getItem(HOLIDAY_KEY);
    return raw ? JSON.parse(raw) : defaultHolidays2026();
  } catch {
    return defaultHolidays2026();
  }
}

export function saveHolidayCalendar(days) {
  localStorage.setItem(HOLIDAY_KEY, JSON.stringify(days));
}

function defaultHolidays2026() {
  return [
    { id: 'h-1', date: '2026-01-26', name: 'Republic Day' },
    { id: 'h-2', date: '2026-03-14', name: 'Holi' },
    { id: 'h-3', date: '2026-08-15', name: 'Independence Day' },
    { id: 'h-4', date: '2026-10-02', name: 'Gandhi Jayanti' },
    { id: 'h-5', date: '2026-10-20', name: 'Diwali' },
    { id: 'h-6', date: '2026-12-25', name: 'Christmas' },
  ];
}
