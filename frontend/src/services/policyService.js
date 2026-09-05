import api from './api';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

export const policyService = {
  /**
   * Get all active company policies
   */
  async getPolicies() {
    const response = await api.get('/policies');
    return unwrap(response);
  },

  /**
   * Get a specific policy by ID
   */
  async getPolicyById(id) {
    const response = await api.get(`/policies/${id}`);
    return unwrap(response);
  },

  /**
   * Acknowledge a policy
   */
  async acknowledgePolicy(id) {
    const response = await api.post(`/policies/${id}/acknowledge`);
    return unwrap(response);
  }
};
