import apiClient from './client';

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', new URLSearchParams({ username: email, password })),
  register: (data: { email: string; username: string; password: string; full_name?: string }) =>
    apiClient.post('/auth/register', data),
  getMe: () => apiClient.get('/auth/me'),
  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', null, { params: { refresh_token: refreshToken } }),
};

// Projects
export const projectsAPI = {
  list: () => apiClient.get('/api/v1/projects'),
  get: (id: string) => apiClient.get(`/api/v1/projects/${id}`),
  create: (data: { name: string; slug: string; description?: string }) =>
    apiClient.post('/api/v1/projects', data),
  delete: (id: string) => apiClient.delete(`/api/v1/projects/${id}`),
};

// Tasks
export const tasksAPI = {
  list: (params?: { project_id?: string; status?: string }) =>
    apiClient.get('/api/v1/tasks', { params }),
  get: (id: string) => apiClient.get(`/api/v1/tasks/${id}`),
  create: (data: { project_id: string; title: string; description?: string; input_data?: object }) =>
    apiClient.post('/api/v1/tasks', data),
  cancel: (id: string) => apiClient.post(`/api/v1/tasks/${id}/cancel`),
};

// Agents
export const agentsAPI = {
  list: (params?: { project_id?: string }) =>
    apiClient.get('/api/v1/agents', { params }),
  get: (id: string) => apiClient.get(`/api/v1/agents/${id}`),
  create: (data: { project_id: string; name: string; agent_type: string; llm_provider?: string }) =>
    apiClient.post('/api/v1/agents', data),
  delete: (id: string) => apiClient.delete(`/api/v1/agents/${id}`),
};

// Analytics
export const analyticsAPI = {
  dashboard: (params?: { project_id?: string; days?: number }) =>
    apiClient.get('/analytics/dashboard', { params }),
  agentPerformance: (days?: number) =>
    apiClient.get('/analytics/agents', { params: { days } }),
  dailyUsage: (days?: number) =>
    apiClient.get('/analytics/usage', { params: { days } }),
};
