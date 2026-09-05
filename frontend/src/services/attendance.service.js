import api from './api';

export const attendanceService = {
  /**
   * Get currently active attendance session for the logged-in user
   */
  async getCurrentSession() {
    const response = await api.get('/attendance/current');
    return response.data?.data;
  },

  /**
   * Record punch in
   */
  async checkIn(payload = {}) {
    const response = await api.post('/attendance/check-in', payload);
    return response.data?.data;
  },

  /**
   * Record punch out
   */
  async checkOut(payload = {}) {
    const response = await api.post('/attendance/check-out', payload);
    return response.data?.data;
  },

  /**
   * Fetch attendance history records
   */
  async getAttendanceHistory(params = {}) {
    const response = await api.get('/attendance/history', { params });
    return response.data?.data || [];
  },

  /**
   * Fetch overtime records
   */
  async getOvertimeRecords(params = {}) {
    const response = await api.get('/attendance/overtime', { params });
    return response.data?.data || [];
  },

  /**
   * Submit an attendance regularization request
   */
  async submitRegularization(payload) {
    const response = await api.post('/attendance/regularization', payload);
    return response.data?.data;
  },

  /**
   * Fetch regularization requests (pending/approved/rejected)
   */
  async getRegularizationRequests(params = {}) {
    const response = await api.get('/attendance/regularization', { params });
    return response.data?.data || [];
  },

  /**
   * Approve a regularization request (HR/Manager)
   */
  async approveRegularization(id) {
    const response = await api.post(`/attendance/regularization/${id}/approve`);
    return response.data?.data;
  },

  /**
   * Reject a regularization request (HR/Manager)
   */
  async rejectRegularization(id, reason) {
    const response = await api.post(`/attendance/regularization/${id}/reject`, {
      rejection_reason: reason,
    });
    return response.data?.data;
  },
};

export default attendanceService;
