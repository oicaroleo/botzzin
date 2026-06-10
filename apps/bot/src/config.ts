import 'dotenv/config';

function getWebhookUrl(): string {
  if (process.env.WEBHOOK_URL) return process.env.WEBHOOK_URL;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return 'http://localhost:3001';
}

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3001'),
    env: process.env.NODE_ENV || 'development',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  },
  webhook: {
    baseUrl: getWebhookUrl(),
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  },
};
