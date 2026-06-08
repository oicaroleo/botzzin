import { createClient } from 'redis';

let redisClient: any = null;

export async function initRedis(): Promise<any> {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  const client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          console.error('[REDIS] Max retries reached');
          return new Error('Redis retry limit exceeded');
        }
        return retries * 50;
      },
    },
  });

  client.on('error', (err: any) => console.error('[REDIS ERROR]', err));
  client.on('connect', () => console.log('[REDIS] Connected'));
  client.on('disconnect', () => console.log('[REDIS] Disconnected'));

  await client.connect();

  redisClient = client;
  return client;
}

export function getRedis(): any {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initRedis() first');
  }
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.disconnect();
  }
}

/**
 * Publicar mensagem do Telegram na fila do bot
 */
export async function publishBotMessage(botId: string, update: any): Promise<void> {
  const redis = getRedis();
  const queueKey = `bot:${botId}:messages`;

  await redis.lPush(queueKey, JSON.stringify(update));
  await redis.expire(queueKey, 86400); // Expira em 24h se não consumida

  console.log('[REDIS] Message published to', queueKey);
}

/**
 * Consumir próxima mensagem da fila do bot (blocking)
 */
export async function consumeBotMessage(botId: string, timeoutSeconds: number = 0): Promise<any | null> {
  const redis = getRedis();
  const queueKey = `bot:${botId}:messages`;

  const result = await redis.brPop(queueKey, timeoutSeconds);

  if (!result) {
    return null;
  }

  return JSON.parse(result.element);
}

/**
 * Verificar se há mensagens aguardando na fila
 */
export async function getQueueLength(botId: string): Promise<number> {
  const redis = getRedis();
  const queueKey = `bot:${botId}:messages`;

  return redis.lLen(queueKey);
}
