import 'dotenv/config';

// Determinar webhook URL automaticamente
// Em produção: usar Railway URL
// Em desenvolvimento: usar variável de ambiente
const getWebhookUrl = (): string => {
  // Se configurado explicitamente, usar
  if (process.env.WEBHOOK_URL) {
    return process.env.WEBHOOK_URL;
  }

  // Em produção Railway, usar variável de URL
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }

  // Fallback: construir a partir de RAILWAY_ENVIRONMENT_NAME e RAILWAY_PROJECT_NAME
  if (process.env.RAILWAY_ENVIRONMENT_NAME && process.env.RAILWAY_PROJECT_NAME) {
    const slug = process.env.RAILWAY_PROJECT_NAME.toLowerCase().replace(/\s+/g, '-');
    return `https://${slug}-${process.env.RAILWAY_ENVIRONMENT_NAME}.up.railway.app`;
  }

  // Desenvolvimento local
  return process.env.WEBHOOK_URL || 'http://localhost:3001';
};

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    webhookUrl: getWebhookUrl(),
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    env: process.env.NODE_ENV || 'development',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  },
  gateways: {
    pushpay: {
      apiKey: process.env.PUSHPAY_API_KEY || '',
    },
    syncpay: {
      apiKey: process.env.SYNCPAY_API_KEY,
    },
  },
};

// Only validate telegram config for server mode
// Worker and manager modes don't need these
const mode = process.env.BOT_MODE || 'server';

if (mode === 'server') {
  if (!config.telegram.botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN não configurado');
  }

  console.log('[CONFIG] Webhook URL:', config.telegram.webhookUrl);
}
