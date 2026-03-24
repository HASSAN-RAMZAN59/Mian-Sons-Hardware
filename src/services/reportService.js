import api from './api';

export const reportService = {
  getSalesReport: async (params) => {
    const response = await api.get('/reports/sales', { params });
    return response.data;
  },

  getInventoryReport: async (params) => {
    const response = await api.get('/reports/inventory', { params });
    return response.data;
  },

  getFinancialReport: async (params) => {
    const response = await api.get('/reports/financial', { params });
    return response.data;
  },

  getHRReport: async (params) => {
    const response = await api.get('/reports/hr', { params });
    return response.data;
  },

  exportReport: async (type, params) => {
    const response = await api.get(`/reports/${type}/export`, { 
      params,
      responseType: 'blob'
    });
    return response.data;
  }
};
