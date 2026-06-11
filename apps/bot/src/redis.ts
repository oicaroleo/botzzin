import { createClient } from 'redis';
import { config } from './config.js';

let redisClient: any = null;

export async function initRedis(): Promise<void> {
  const client = createClient({
    url: config.redis.url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) return new Error('Redis retry limit exceeded');
        return retries * 100;
      },
    },
  });

  client.on('error', (err) => console.error('[REDIS ERROR]', err));
  client.on('connect', () => console.log('[REDIS] Connected'));

  await client.connect();
  redisClient = client;
}

export function getRedis(): any {
  if (!redisClient) throw new Error('Redis not initialized');
  return redisClient;
}

// Conexões bloqueantes dedicadas por bot. brPop é um comando bloqueante: se vários
// workers compartilham a mesma conexão, o brPop de um bot trava a conexão por até
// `timeoutSec` enquanto os demais esperam — fazendo mensagens ficarem presas na fila.
// Cada worker recebe sua própria conexão para consumir em paralelo.
const blockingClients = new Map<string, any>();

async function getBlockingClient(botId: string) {
  let client = blockingClients.get(botId);
  if (client?.isReady) return client;
  client = getRedis().duplicate();
  client.on('error', (err: any) => console.error(`[REDIS BLOCK ${botId}]`, err));
  await client.connect();
  blockingClients.set(botId, client);
  return client;
}

// Fila de mensagens por bot
export async function publishBotMessage(botId: string, update: unknown) {
  const key = `bot:${botId}:queue`;
  await getRedis().lPush(key, JSON.stringify(update));
  await getRedis().expire(key, 86400);
}

export async function consumeBotMessage(botId: string, timeoutSec = 30) {
  const key = `bot:${botId}:queue`;
  const client = await getBlockingClient(botId);
  const result = await client.brPop(key, timeoutSec);
  return result ? JSON.parse(result.element) : null;
}

// Sessão por usuário (TTL 2h)
export interface BotSession {
  leadId: string;
  selectedPlanId?: string;
  isRenewal?: boolean; // true quando o lead está renovando (aplica desconto de renovação)
  orderBumpOffered?: boolean;  // já mostrou a oferta de order bump nesta sessão
  orderBumpAccepted?: boolean; // lead aceitou o order bump
  priceOverride?: number;      // preço final já com desconto (ofertas de esteira)
  funnelStepId?: string;       // step da esteira da oferta (override de entrega)
}

export async function getSession(botId: string, telegramUserId: string): Promise<BotSession | null> {
  const key = `session:${botId}:${telegramUserId}`;
  const raw = await getRedis().get(key);
  return raw ? JSON.parse(raw) : null;
}

export async function setSession(botId: string, telegramUserId: string, data: BotSession) {
  const key = `session:${botId}:${telegramUserId}`;
  await getRedis().set(key, JSON.stringify(data), { EX: 7200 });
}

export async function updateSession(botId: string, telegramUserId: string, data: Partial<BotSession>) {
  const current = await getSession(botId, telegramUserId);
  if (current) await setSession(botId, telegramUserId, { ...current, ...data });
}
