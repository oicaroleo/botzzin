# Primeiros Passos — Teste Local

## Passo 1: Obter Token do BotFather

1. Abra Telegram
2. Procure por **@BotFather**
3. Envie `/newbot`
4. Siga as instruções (nome, username)
5. Copie o **token** gerado (será algo como: `123456789:ABCdefGHIjklmnoPQRstuvWXYZabcDefgh`)

---

## Passo 2: Setup Local

```bash
# 1. Instalar dependências
pnpm install

# 2. Copiar .env.example
cp .env.example .env

# 3. Editar .env com seu token
# Linux/Mac:
nano .env
# Windows (PowerShell):
notepad .env
```

Adicione no `.env`:
```env
TELEGRAM_BOT_TOKEN=seu_token_aqui
WEBHOOK_URL=http://localhost:3000
NODE_ENV=development
PORT=3000
```

---

## Passo 3: Usar ngrok para URL Pública (Desenvolvimento)

O Telegram precisa de uma URL pública para chamar seu webhook. No desenvolvimento, use **ngrok**:

### Instalar ngrok
```bash
# Mac (via Homebrew)
brew install ngrok

# Windows (via Chocolatey)
choco install ngrok

# Ou download direto: https://ngrok.com/download
```

### Rodar ngrok
```bash
ngrok http 3000
```

Você verá algo assim:
```
Forwarding    https://abc123def.ngrok.io -> http://localhost:3000
```

Copie a URL `https://abc123def.ngrok.io` — será sua `WEBHOOK_URL` real.

---

## Passo 4: Atualizar .env com URL do ngrok

```env
TELEGRAM_BOT_TOKEN=seu_token_aqui
WEBHOOK_URL=https://abc123def.ngrok.io  # URL do ngrok
NODE_ENV=development
PORT=3000
```

---

## Passo 5: Rodar o Servidor

```bash
pnpm dev
```

Você verá:
```
[SERVER] Servidor rodando em http://0.0.0.0:3000
[SERVER] Webhook URL: https://abc123def.ngrok.io/webhook
[SETUP] Para ativar o webhook, acesse: POST http://localhost:3000/admin/setup-webhook
```

---

## Passo 6: Registrar o Webhook

Em outro terminal:
```bash
curl -X POST http://localhost:3000/admin/setup-webhook
```

Resposta esperada:
```json
{
  "success": true,
  "webhookUrl": "https://abc123def.ngrok.io/webhook",
  "message": "Webhook registrado com sucesso!"
}
```

---

## Passo 7: Testar o Bot no Telegram

1. Abra Telegram
2. Procure pelo username do seu bot (ex: @meu_bot_teste)
3. Clique **START**
4. Você verá:
   ```
   👋 Bem-vindo ao BotZZIN!
   
   Aqui você pode:
   ✅ Gerar PIX para pagamento
   ✅ Acessar conteúdo exclusivo
   ✅ Receber suporte 24/7
   
   [💳 Gerar PIX] [📱 Suporte]
   ```
5. Clique em **💳 Gerar PIX**
6. Você receberá um PIX simulado com QR Code
7. Clique em **✅ Já Paguei**
8. Receberá confirmação!

---

## Passo 8: Verificar Logs

No terminal, você verá:
```
[BOT] Start command from user 123456789 in chat 123456789
[BOT] PIX generated for user 123456789
[BOT] Payment confirmed for user 123456789
```

---

## Troubleshooting

### "webhook not accessible"
- Verifique se ngrok está rodando em outro terminal
- Confirme que a URL no `.env` é a do ngrok (começa com `https://`)

### "404 on /webhook"
- O servidor pode estar desligado
- Verifique se `pnpm dev` está rodando

### Bot não responde no Telegram
- Espere alguns segundos (webhook pode levar pouco)
- Tente enviar `/start` novamente
- Verifique os logs no terminal

---

## Próximo: Integração de Pagamento Real

Quando estiver pronto, na **Fase 2**:
1. Integrar com **PushinPay** ou **SyncPay**
2. Receber webhook de confirmação de pagamento
3. Validar e liberar acesso ao grupo/canal

Por enquanto, a jornada é simulada — perfeito para testar a UX!
