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

// Chat
export const chatAPI = {
  listConversations: (archived?: boolean) =>
    apiClient.get('/api/v1/chat/conversations', { params: { archived } }),
  getConversation: (id: string) =>
    apiClient.get(`/api/v1/chat/conversations/${id}`),
  createConversation: (data: { title?: string; model?: string; system_prompt?: string }) =>
    apiClient.post('/api/v1/chat/conversations', data),
  deleteConversation: (id: string) =>
    apiClient.delete(`/api/v1/chat/conversations/${id}`),
  getMessages: (conversationId: string) =>
    apiClient.get(`/api/v1/chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, data: { content: string; model?: string }) =>
    apiClient.post(`/api/v1/chat/conversations/${conversationId}/messages`, data),
  renameConversation: (id: string, title: string) =>
    apiClient.patch(`/api/v1/chat/conversations/${id}/rename`, null, { params: { title } }),
  togglePin: (id: string) =>
    apiClient.patch(`/api/v1/chat/conversations/${id}/pin`),
  toggleArchive: (id: string) =>
    apiClient.patch(`/api/v1/chat/conversations/${id}/archive`),
};

// Subscriptions
export const subscriptionsAPI = {
  listPlans: () => apiClient.get('/api/v1/subscriptions/plans'),
  getCurrent: () => apiClient.get('/api/v1/subscriptions/current'),
  getUsage: () => apiClient.get('/api/v1/subscriptions/usage'),
  upgrade: (data: { tier: string; billing_cycle: string; payment_method_id?: string }) =>
    apiClient.post('/api/v1/subscriptions/upgrade', data),
  cancel: () => apiClient.post('/api/v1/subscriptions/cancel'),
  getBillingHistory: () => apiClient.get('/api/v1/subscriptions/billing-history'),
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
