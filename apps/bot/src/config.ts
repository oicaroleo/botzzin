import 'dotenv/config';

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    webhookUrl: process.env.WEBHOOK_URL,
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

if (!config.telegram.botToken) {
  throw new Error('TELEGRAM_BOT_TOKEN não configurado');
}

if (!config.telegram.webhookUrl) {
  throw new Error('WEBHOOK_URL não configurado');
}
