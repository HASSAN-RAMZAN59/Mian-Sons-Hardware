import api from './api';

export const auditService = {
  getAll: async (params) => {
    const response = await api.get('/audit-logs', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/audit-logs/${id}`);
    return response.data;
  },

  getByUser: async (userId, params) => {
    const response = await api.get(`/audit-logs/user/${userId}`, { params });
    return response.data;
  },

  getByAction: async (action, params) => {
    const response = await api.get(`/audit-logs/action/${action}`, { params });
    return response.data;
  }
};
