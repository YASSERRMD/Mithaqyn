import { apiClient } from './api';

export const contractsApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get('/contracts', { params }),
  getById: (id: string) => apiClient.get(`/contracts/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post('/contracts', data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/contracts/${id}`, data),
  delete: (id: string) => apiClient.delete(`/contracts/${id}`),
  upload: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post(`/contracts/${id}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getDocuments: (id: string) => apiClient.get(`/contracts/${id}/documents`),
};

export const counterpartiesApi = {
  list: (search?: string) => apiClient.get('/counterparties', { params: { search } }),
  create: (data: Record<string, unknown>) => apiClient.post('/counterparties', data),
};
