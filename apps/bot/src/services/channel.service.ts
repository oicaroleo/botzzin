const TG = 'https://api.telegram.org';

async function callTelegram(token: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`${TG}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json() as { ok: boolean; result?: unknown; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description}`);
  return json.result;
}

export async function generateInviteLink(
  botToken: string,
  channelId: string,
  daysValid: number
): Promise<string> {
  const expireDate = Math.floor(Date.now() / 1000) + daysValid * 86400;

  const result = await callTelegram(botToken, 'createChatInviteLink', {
    chat_id: channelId,
    expire_date: expireDate,
    member_limit: 1,
  }) as { invite_link: string };

  return result.invite_link;
}

export async function sendMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  extra: Record<string, unknown> = {}
) {
  return callTelegram(botToken, 'sendMessage', { chat_id: chatId, text, ...extra });
}

export async function answerCallbackQuery(botToken: string, callbackQueryId: string, text?: string) {
  // Best-effort: só remove o "loading" do botão. Se falhar (query expirada/inválida),
  // não deve travar a ação do usuário (compra, etc.).
  try {
    return await callTelegram(botToken, 'answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...(text ? { text } : {}),
    });
  } catch (e) {
    console.warn('[TG] answerCallbackQuery falhou (ignorado):', (e as Error).message);
  }
}

export async function sendChatAction(botToken: string, chatId: string | number, action: string) {
  return callTelegram(botToken, 'sendChatAction', { chat_id: chatId, action });
}

// Envia uma imagem PNG a partir de um data URI / base64 (ex.: QR Code do PIX).
export async function sendPhotoBase64(
  botToken: string,
  chatId: string | number,
  base64: string,
  caption?: string,
  extra: Record<string, unknown> = {},
) {
  const clean = base64.includes(',') ? base64.split(',')[1] : base64; // remove "data:image/png;base64,"
  const buffer = Buffer.from(clean, 'base64');
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('photo', new Blob([new Uint8Array(buffer)], { type: 'image/png' }), 'qrcode.png');
  if (caption) { form.append('caption', caption); form.append('parse_mode', 'HTML'); }
  for (const [k, v] of Object.entries(extra)) form.append(k, typeof v === 'string' ? v : JSON.stringify(v));

  const res = await fetch(`${TG}/bot${botToken}/sendPhoto`, { method: 'POST', body: form });
  const json = await res.json() as { ok: boolean; description?: string };
  if (!json.ok) throw new Error(`Telegram sendPhoto falhou: ${json.description}`);
  return json;
}

// Remove (expulsa) um membro do canal/grupo sem banir permanentemente: ban seguido
// de unban deixa o usuário fora mas livre para reentrar numa futura renovação.
export async function kickChatMember(botToken: string, chatId: string | number, userId: string | number) {
  await callTelegram(botToken, 'banChatMember', { chat_id: chatId, user_id: userId });
  // unban com only_if_banned para não recriar histórico; permite reentrada via novo link
  await callTelegram(botToken, 'unbanChatMember', { chat_id: chatId, user_id: userId, only_if_banned: true });
}

// ─── Upload de mídia para o canal de cache → retorna file_id reutilizável ─────
// Envia o arquivo ao chat (canal/grupo onde o bot é admin) e extrai o file_id
// da mensagem resultante. Esse file_id é depois reusado para reenviar a mídia
// sem reupload (prévias de boas-vindas, upsell, downsell, order bump…).

type CachedMedia = { fileId: string; type: 'photo' | 'video' | 'audio' | 'document' };

export async function sendMediaToChat(
  botToken: string,
  chatId: string | number,
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<CachedMedia> {
  const mt = (mimeType || '').toLowerCase();
  let method: string, field: string, type: CachedMedia['type'];
  if (mt.startsWith('image/'))      { method = 'sendPhoto';    field = 'photo';    type = 'photo'; }
  else if (mt.startsWith('video/')) { method = 'sendVideo';    field = 'video';    type = 'video'; }
  else if (mt.startsWith('audio/')) { method = 'sendAudio';    field = 'audio';    type = 'audio'; }
  else                              { method = 'sendDocument'; field = 'document'; type = 'document'; }

  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('disable_notification', 'true');
  form.append(field, new Blob([new Uint8Array(buffer)], { type: mt || 'application/octet-stream' }), filename || 'media');

  const res = await fetch(`${TG}/bot${botToken}/${method}`, { method: 'POST', body: form });
  const json = await res.json() as { ok: boolean; result?: any; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method} falhou: ${json.description}`);

  const r = json.result;
  let fileId: string | undefined;
  if (type === 'photo') fileId = r.photo?.[r.photo.length - 1]?.file_id; // maior resolução
  else                  fileId = r[field]?.file_id;
  if (!fileId) throw new Error('Telegram não retornou file_id');

  return { fileId, type };
}

// Reenvia uma mídia já cacheada (por file_id) — sem reupload.
export async function sendCachedMedia(
  botToken: string,
  chatId: string | number,
  media: { fileId: string; type: string },
  caption?: string,
) {
  const map: Record<string, [string, string]> = {
    photo:    ['sendPhoto', 'photo'],
    video:    ['sendVideo', 'video'],
    audio:    ['sendAudio', 'audio'],
    document: ['sendDocument', 'document'],
  };
  const [method, field] = map[media.type] || map.document;
  return callTelegram(botToken, method, {
    chat_id: chatId, [field]: media.fileId,
    ...(caption ? { caption, parse_mode: 'HTML' } : {}),
  });
}
