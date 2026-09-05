/**
 * Dashboard Service
 * ─────────────────
 * Real API calls to the PeoplePay360 backend.
 */

import api from './api';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

export const dashboardService = {
  async getStats() {
    const response = await api.get('/dashboard/stats');
    return unwrap(response) ?? {};
  },
};
