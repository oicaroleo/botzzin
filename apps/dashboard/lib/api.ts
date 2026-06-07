import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://botzzin-production.up.railway.app';

export const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  signup: (email: string, password: string, name: string) =>
    api.post('/api/auth/signup', { email, password, name }),
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  me: () => api.get('/api/auth/me'),
};

export const botsAPI = {
  list: () => api.get('/api/bots'),
  get: (botId: string) => api.get(`/api/bots/${botId}`),
  create: (telegramBotToken: string) =>
    api.post('/api/bots', { telegramBotToken }),
  update: (botId: string, data: any) =>
    api.patch(`/api/bots/${botId}`, data),
  delete: (botId: string) => api.delete(`/api/bots/${botId}`),
};

export const configAPI = {
  get: (botId: string) => api.get(`/api/bots/${botId}/config`),
  update: (botId: string, data: any) =>
    api.post(`/api/bots/${botId}/config`, data),
};

export const plansAPI = {
  list: (botId: string) => api.get(`/api/bots/${botId}/plans`),
  create: (botId: string, data: any) =>
    api.post(`/api/bots/${botId}/plans`, data),
  update: (botId: string, planId: string, data: any) =>
    api.patch(`/api/bots/${botId}/plans/${planId}`, data),
  delete: (botId: string, planId: string) =>
    api.delete(`/api/bots/${botId}/plans/${planId}`),
  setDefault: (botId: string, planId: string) =>
    api.post(`/api/bots/${botId}/plans/${planId}/set-default`),
};

export const metricsAPI = {
  summary: (botId: string, days?: number) =>
    api.get(`/api/bots/${botId}/metrics`, { params: { days } }),
  leads: (botId: string, params?: any) =>
    api.get(`/api/bots/${botId}/leads`, { params }),
  leadDetails: (botId: string, leadId: string) =>
    api.get(`/api/bots/${botId}/leads/${leadId}`),
  revenue: (botId: string, days?: number) =>
    api.get(`/api/bots/${botId}/charts/revenue`, { params: { days } }),
  conversion: (botId: string, days?: number) =>
    api.get(`/api/bots/${botId}/charts/conversion`, { params: { days } }),
};
