# 🚀 Railway Setup para Arquitetura Multi-Bot com Redis

## Pré-requisitos

1. Projeto Railway criado
2. Variáveis de ambiente configuradas

## Step 1: Adicionar Redis Add-on

No painel do Railway:

1. Clique em "Add Service" ou "Add Database"
2. Selecione **Redis** na marketplace
3. Confirme - Railway automaticamente:
   - Cria o container Redis
   - Adiciona a variável `REDIS_URL` no plugin

## Step 2: Configurar Webhook Server

Este é o container principal que recebe mensagens do Telegram.

### Variables

```
BOT_MODE=server
TELEGRAM_WEBHOOK_URL=https://botzzin-production.up.railway.app
PORT=8080
NODE_ENV=production
```

### Build

- Builder: DOCKERFILE
- Deploy port: 8080
- Start command: deixar em branco (usa `/app/entrypoint.sh`)

### Health Check

```
GET /health
Timeout: 10s
Start period: 60s
```

## Step 3: Adicionar Bot Workers (AUTOMÁTICO) ⭐

### Opção A: Worker Manager (Recomendado)

Inicia automaticamente um worker para **cada bot no banco**:

1. Clique **"Add Service"** → **"Dockerfile"**
2. Name: `bot-worker-manager`
3. Variables: 
   ```
   BOT_MODE=manager
   ```
4. Deploy

**Pronto!** Railway automaticamente:
- Lê todos os bots do banco
- Inicia um worker para cada um
- Se adicionar novo bot no banco, reinicie o manager

### Opção B: Worker Individual (Manual)

Se prefere controlar cada bot:

1. Clique **"Add Service"** → **"Dockerfile"**
2. Name: `bot-worker-{numero}`
3. Variables:
   ```
   BOT_MODE=worker
   BOT_ID={copiar-do-banco-de-dados}
   ```
4. Deploy
5. **Repita para cada bot**

### Escalar um Bot Específico

Se um bot recebe muitas mensagens, crie múltiplas instâncias:
- bot-worker-premium-1 (BOT_MODE=worker, BOT_ID=bot1)
- bot-worker-premium-2 (BOT_MODE=worker, BOT_ID=bot1)
- bot-worker-premium-3 (BOT_MODE=worker, BOT_ID=bot1)

## Step 4: Variáveis Globais (compartilhadas)

Defina essas variáveis no Railway project settings (serão herdadas por todos os serviços):

```
DATABASE_URL=postgres://...
REDIS_URL=redis://...
JWT_SECRET=seu-secret-aqui
NODE_ENV=production
```

## Arquitetura Final

```
┌─ Telegram Messages
│
↓
┌──────────────────────┐
│  Webhook Server      │
│  (port 8080)         │
│  BOT_MODE=server     │
└──────┬───────────────┘
       │
       → Redis Queue (bot:{id}:messages)
       │
       ├─ bot-worker-1 (BOT_ID=bot1)
       ├─ bot-worker-2 (BOT_ID=bot2)
       ├─ bot-worker-3 (BOT_ID=bot3)
       └─ bot-worker-N (BOT_ID=botN)
```

## Próximas Mensagens do Bot

Quando testa o bot no Telegram:

1. Mensagem chega → Telegram chama `https://domain.railway.app/webhook/{botId}`
2. Webhook valida e publica na fila Redis: `bot:{botId}:messages`
3. Worker específico consome da fila e processa
4. Bot responde diretamente via Telegram API

## Monitoramento

No painel do Railway, você vê:

- **Webhook server**: logs de requisições recebidas
- **Workers**: logs de processamento de mensagens
- **Redis**: estado da fila

## Escalabilidade

Para escalar um bot que recebe muitas mensagens:

1. Aumento de CPU/RAM para webhook server
2. Crie múltiplas instâncias do worker para aquele `BOT_ID`
3. Redis distribui automaticamente entre workers

## Troubleshooting

### Redis connection failed

- Verifique se Redis add-on foi adicionado
- Verifique variável `REDIS_URL` está definida
- Reinicie os serviços

### Worker não consome mensagens

- Verifique `BOT_ID` está correto
- Verifique bot existe no banco de dados
- Verifique logs do worker

### Webhook não recebe mensagens

- Verificar URL do webhook em "TELEGRAM_WEBHOOK_URL"
- Testar: `curl https://domain.up.railway.app/health`
- Verificar variável `TELEGRAM_WEBHOOK_URL` no server

---

**Status**: ✅ Pronto para produção!
