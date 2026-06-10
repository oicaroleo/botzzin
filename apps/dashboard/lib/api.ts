import axios from 'axios';

// Usa o proxy do Next.js (next.config.ts redireciona /api/* → backend)
// Isso evita CORS e funciona em qualquer ambiente
const API_URL = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003');

export const api = axios.create({ baseURL: API_URL, withCredentials: false });

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
  list:   ()                         => api.get('/api/bots'),
  get:    (botId: string)            => api.get(`/api/bots/${botId}`),
  create: (telegramBotToken: string) => api.post('/api/bots', { telegramBotToken }),
  update: (botId: string, data: any) => api.patch(`/api/bots/${botId}`, data),
  delete: (botId: string)            => api.delete(`/api/bots/${botId}`),
  registerWebhook: (botId: string)   => api.post(`/api/bots/${botId}/webhook/register`, {}),
  webhookStatus:   (botId: string)   => api.get(`/api/bots/${botId}/webhook/status`),
};

// Legacy aliases (alguns components antigos ainda usam essas APIs)
export const webhookAPI = {
  setupWebhook: (botId: string) => botsAPI.registerWebhook(botId),
  status:       (botId: string) => botsAPI.webhookStatus(botId),
};

// plansAPI removido — use flowAPI.createPlan / flowAPI.deletePlan
export const plansAPI = {
  list:   (botId: string)                          => api.get(`/api/bots/${botId}/plans`),
  create: (botId: string, data: any)               => api.post(`/api/bots/${botId}/plans`, data),
  update: (botId: string, planId: string, data: any) => api.patch(`/api/bots/${botId}/plans/${planId}`, data),
  delete: (botId: string, planId: string)          => api.delete(`/api/bots/${botId}/plans/${planId}`),
  setDefault: (botId: string, planId: string)      => api.post(`/api/bots/${botId}/plans/${planId}/set-default`, {}),
};

// ── Gateways (nível de conta) ────────────────────────────────────────────────
export const gatewayAPI = {
  list:    ()                                                        => api.get('/api/gateways'),
  add:     (data: { provider: string; apiKey: string; displayName?: string }) => api.post('/api/gateways', data),
  update:  (id: string, data: any)                                  => api.patch(`/api/gateways/${id}`, data),
  remove:  (id: string)                                             => api.delete(`/api/gateways/${id}`),
  reorder: (orderedIds: string[])                                   => api.post('/api/gateways/reorder', { orderedIds }),
  updateSettings: (data: { abTestEnabled?: boolean; platformIntelligenceEnabled?: boolean }) =>
    api.patch('/api/gateways/settings', data),
};

// ── Flows ────────────────────────────────────────────────────────────────────
export const flowAPI = {
  list:          ()                             => api.get('/api/flows'),
  get:           (flowId: string)               => api.get(`/api/flows/${flowId}`),
  channels:      (flowId: string)               => api.get(`/api/flows/${flowId}/channels`),
  create:        (data: any)                    => api.post('/api/flows', data),
  update:        (flowId: string, data: any)    => api.patch(`/api/flows/${flowId}`, data),
  remove:        (flowId: string)               => api.delete(`/api/flows/${flowId}`),
  assignBot:     (flowId: string, botId: string) => api.post(`/api/flows/${flowId}/bots`, { botId }),
  removeBot:     (flowId: string, botId: string) => api.delete(`/api/flows/${flowId}/bots/${botId}`),
  createPlan:    (flowId: string, data: any)    => api.post(`/api/flows/${flowId}/plans`, data),
  updatePlan:    (flowId: string, planId: string, data: any) => api.patch(`/api/flows/${flowId}/plans/${planId}`, data),
  deletePlan:    (flowId: string, planId: string)            => api.delete(`/api/flows/${flowId}/plans/${planId}`),
  setDefaultPlan:(flowId: string, planId: string)            => api.post(`/api/flows/${flowId}/plans/${planId}/set-default`, {}),
  createStep:    (flowId: string, data: any)                 => api.post(`/api/flows/${flowId}/steps`, data),
  updateStep:    (flowId: string, stepId: string, data: any) => api.patch(`/api/flows/${flowId}/steps/${stepId}`, data),
  deleteStep:    (flowId: string, stepId: string)            => api.delete(`/api/flows/${flowId}/steps/${stepId}`),
  saveOrderBump: (flowId: string, context: string, data: any) => api.put(`/api/flows/${flowId}/orderbumps/${context}`, data),
  uploadMedia:   async (flowId: string, file: File) => {
    const dataBase64 = await fileToBase64(file);
    return api.post(`/api/flows/${flowId}/media`, { filename: file.name, mimeType: file.type, dataBase64 });
  },
};

// Lê o arquivo e devolve só o conteúdo base64 (sem o prefixo data:…;base64,)
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const metricsAPI = {
  summary:  (botId: string, days?: number) => api.get(`/api/bots/${botId}/metrics`, { params: { days } }),
  leads:    (botId: string, params?: any)  => api.get(`/api/bots/${botId}/leads`, { params }),
  revenue:  (botId: string, days?: number) => api.get(`/api/bots/${botId}/charts/revenue`, { params: { days } }),
};
