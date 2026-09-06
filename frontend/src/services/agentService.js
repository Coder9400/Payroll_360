import api from './api';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

export const agentService = {
  async runPayroll({ employeeId, periodStart, periodEnd }) {
    const response = await api.post('/agent/run-payroll', {
      employee_id: employeeId,
      period_start: periodStart,
      period_end: periodEnd,
    });
    return unwrap(response);
  },
  async getStatus(jobId) {
    const response = await api.get(`/agent/status/${jobId}`);
    return unwrap(response);
  },
  async approve(jobId) {
    const response = await api.post(`/agent/approve/${jobId}`);
    return unwrap(response);
  },
  async reject(jobId, reason = '') {
    const response = await api.post(`/agent/reject/${jobId}`, { reason });
    return unwrap(response);
  },
};
