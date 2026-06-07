# 🧪 Testes - Fase 2 & 3: Configuração, Planos e Métricas

## 📋 Tabela de Conteúdo
1. [Configuração de Bot (Fase 2.1)](#configuração-de-bot-fase-21)
2. [Gerenciamento de Planos (Fase 2.2)](#gerenciamento-de-planos-fase-22)
3. [Métricas e Relatórios (Fase 3.1)](#métricas-e-relatórios-fase-31)

---

## Configuração de Bot (Fase 2.1)

### 1️⃣ Obter Configuração Atual

```bash
curl -X GET http://localhost:3000/api/bots/BOT_ID/config \
  -H "Authorization: Bearer TOKEN"
```

**Resposta esperada (200):**
```json
{
  "botId": "bot-id-aqui",
  "telegramUsername": "@meu_bot",
  "welcomeMessage": "Bem-vindo ao meu bot!",
  "welcomeMediaUrl": null,
  "defaultChannelId": null,
  "config": {
    "id": "config-id",
    "botId": "bot-id-aqui",
    "channelId": null,
    "channelName": null,
    "isActive": true
  },
  "createdAt": "2026-06-07T14:30:00Z",
  "updatedAt": "2026-06-07T14:30:00Z"
}
```

---

### 2️⃣ Atualizar Configuração (com validação de canal)

```bash
# Nota: channelId pode ser o ID do canal (-3966757980) ou nome (@canal)
curl -X POST http://localhost:3000/api/bots/BOT_ID/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "channelId": "-3966757980",
    "channelName": "Canal Exclusivo",
    "welcomeMessage": "🎉 Bem-vindo ao meu canal exclusivo! Aqui você encontrará conteúdo premium."
  }'
```

**Resposta esperada (200):**
```json
{
  "botId": "bot-id-aqui",
  "defaultChannelId": "-3966757980",
  "welcomeMessage": "🎉 Bem-vindo ao meu canal exclusivo!...",
  "config": {
    "channelId": "-3966757980",
    "channelName": "Canal Exclusivo"
  }
}
```

---

### 3️⃣ Atualizar Mídia de Boas-vindas

```bash
# URL de uma imagem válida (JPG, PNG, etc)
curl -X POST http://localhost:3000/api/bots/BOT_ID/config/media \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "mediaUrl": "https://example.com/imagem.jpg"
  }'
```

---

### 4️⃣ Testar Webhook

```bash
curl -X POST http://localhost:3000/api/bots/BOT_ID/config/test-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "webhookUrl": "https://seu-webhook-url.com"
  }'
```

**Resposta esperada:**
```json
{
  "success": true
}
```

---

### 5️⃣ Registrar Webhook no Telegram

```bash
curl -X POST http://localhost:3000/api/bots/BOT_ID/config/register-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "webhookUrl": "https://seu-webhook-url.com"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Webhook registrado com sucesso!"
}
```

---

## Gerenciamento de Planos (Fase 2.2)

### 1️⃣ Criar Novo Plano

```bash
curl -X POST http://localhost:3000/api/bots/BOT_ID/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Plano 7 Dias",
    "description": "Acesso por 7 dias",
    "days": 7,
    "price": 19.90,
    "emoji": "🎯",
    "priority": 0,
    "isActive": true
  }'
```

**Resposta esperada (201):**
```json
{
  "id": "plan-id",
  "name": "Plano 7 Dias",
  "description": "Acesso por 7 dias",
  "days": 7,
  "price": 19.90,
  "emoji": "🎯",
  "isActive": true,
  "isDefault": false,
  "priority": 0,
  "createdAt": "2026-06-07T15:00:00Z",
  "updatedAt": "2026-06-07T15:00:00Z"
}
```

---

### 2️⃣ Criar Múltiplos Planos

```bash
# Plano 30 dias
curl -X POST http://localhost:3000/api/bots/BOT_ID/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Plano 30 Dias",
    "days": 30,
    "price": 49.90,
    "emoji": "💎",
    "priority": 1
  }'

# Plano VIP 90 dias
curl -X POST http://localhost:3000/api/bots/BOT_ID/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Plano VIP 90 Dias",
    "days": 90,
    "price": 99.90,
    "emoji": "👑",
    "priority": 2
  }'
```

---

### 3️⃣ Listar Planos do Bot

```bash
curl -X GET http://localhost:3000/api/bots/BOT_ID/plans \
  -H "Authorization: Bearer TOKEN"
```

**Resposta esperada:**
```json
{
  "plans": [
    {
      "id": "plan-id-1",
      "name": "Plano 7 Dias",
      "days": 7,
      "price": 19.90,
      "emoji": "🎯",
      "isDefault": false,
      "priority": 0
    },
    {
      "id": "plan-id-2",
      "name": "Plano 30 Dias",
      "days": 30,
      "price": 49.90,
      "emoji": "💎",
      "isDefault": false,
      "priority": 1
    }
  ],
  "total": 2
}
```

---

### 4️⃣ Marcar Plano como Padrão

```bash
curl -X POST http://localhost:3000/api/bots/BOT_ID/plans/PLAN_ID/set-default \
  -H "Authorization: Bearer TOKEN"
```

---

### 5️⃣ Obter Plano Padrão

```bash
curl -X GET http://localhost:3000/api/bots/BOT_ID/plans/default \
  -H "Authorization: Bearer TOKEN"
```

---

### 6️⃣ Atualizar Plano

```bash
curl -X PATCH http://localhost:3000/api/bots/BOT_ID/plans/PLAN_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Plano 7 Dias (Promoção)",
    "price": 14.90
  }'
```

---

### 7️⃣ Deletar Plano

```bash
curl -X DELETE http://localhost:3000/api/bots/BOT_ID/plans/PLAN_ID \
  -H "Authorization: Bearer TOKEN"
```

---

## Métricas e Relatórios (Fase 3.1)

### 1️⃣ Dashboard de Métricas

```bash
# Últimos 30 dias (padrão)
curl -X GET http://localhost:3000/api/bots/BOT_ID/metrics \
  -H "Authorization: Bearer TOKEN"

# Últimos 7 dias
curl -X GET "http://localhost:3000/api/bots/BOT_ID/metrics?days=7" \
  -H "Authorization: Bearer TOKEN"

# Range customizado
curl -X GET "http://localhost:3000/api/bots/BOT_ID/metrics?startDate=2026-05-01&endDate=2026-06-07" \
  -H "Authorization: Bearer TOKEN"
```

**Resposta esperada:**
```json
{
  "period": {
    "startDate": "2026-05-08T14:30:00Z",
    "endDate": "2026-06-07T14:30:00Z"
  },
  "summary": {
    "totalLeads": 150,
    "leadsNovosPeriodo": 50,
    "pixGerados": 40,
    "pixPagos": 25,
    "totalReceita": 498.75,
    "conversionRate": 50.0
  },
  "statusBreakdown": {
    "started": 25,
    "generated_pix": 15,
    "paid": 25,
    "failed": 10
  }
}
```

---

### 2️⃣ Listar Leads com Filtros

```bash
# Todos os leads
curl -X GET http://localhost:3000/api/bots/BOT_ID/leads \
  -H "Authorization: Bearer TOKEN"

# Leads pagos
curl -X GET "http://localhost:3000/api/bots/BOT_ID/leads?status=paid" \
  -H "Authorization: Bearer TOKEN"

# Leads que geraram PIX
curl -X GET "http://localhost:3000/api/bots/BOT_ID/leads?status=generated_pix" \
  -H "Authorization: Bearer TOKEN"

# Buscar por username
curl -X GET "http://localhost:3000/api/bots/BOT_ID/leads?search=joao" \
  -H "Authorization: Bearer TOKEN"

# Paginação
curl -X GET "http://localhost:3000/api/bots/BOT_ID/leads?page=2&pageSize=10" \
  -H "Authorization: Bearer TOKEN"

# Últimos 7 dias
curl -X GET "http://localhost:3000/api/bots/BOT_ID/leads?days=7" \
  -H "Authorization: Bearer TOKEN"
```

**Resposta esperada:**
```json
{
  "leads": [
    {
      "id": "lead-id",
      "telegramUserId": "123456789",
      "telegramUsername": "joao_silva",
      "telegramFirstName": "João",
      "status": "paid",
      "planDays": 30,
      "pixAttempts": 1,
      "totalMessages": 5,
      "lastPaymentStatus": "confirmed",
      "lastPaymentAmount": 49.90,
      "lastPaymentDate": "2026-06-05T10:30:00Z",
      "paidAt": "2026-06-05T10:35:00Z",
      "createdAt": "2026-06-03T14:20:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### 3️⃣ Detalhes de um Lead

```bash
curl -X GET http://localhost:3000/api/bots/BOT_ID/leads/LEAD_ID \
  -H "Authorization: Bearer TOKEN"
```

**Resposta esperada:**
```json
{
  "id": "lead-id",
  "telegramUserId": "123456789",
  "status": "paid",
  "payments": [
    {
      "id": "payment-id",
      "amount": 49.90,
      "status": "confirmed",
      "gateway": "pushpay",
      "confirmedAt": "2026-06-05T10:35:00Z"
    }
  ],
  "interactions": [
    {
      "id": "interaction-id",
      "type": "message_sent",
      "data": { "message": "Bem-vindo!" },
      "createdAt": "2026-06-03T14:20:00Z"
    }
  ],
  "delivery": {
    "channelLink": "https://t.me/c/...",
    "deliveredAt": "2026-06-05T10:40:00Z"
  }
}
```

---

### 4️⃣ Gráfico de Receita

```bash
# Últimos 30 dias
curl -X GET http://localhost:3000/api/bots/BOT_ID/charts/revenue \
  -H "Authorization: Bearer TOKEN"

# Últimos 7 dias
curl -X GET "http://localhost:3000/api/bots/BOT_ID/charts/revenue?days=7" \
  -H "Authorization: Bearer TOKEN"
```

**Resposta esperada:**
```json
{
  "data": [
    { "date": "2026-05-08", "amount": 0 },
    { "date": "2026-05-09", "amount": 49.90 },
    { "date": "2026-05-10", "amount": 99.80 },
    { "date": "2026-05-11", "amount": 0 },
    // ... mais dias
    { "date": "2026-06-07", "amount": 49.90 }
  ],
  "period": "Últimos 30 dias"
}
```

---

### 5️⃣ Gráfico de Conversão

```bash
curl -X GET http://localhost:3000/api/bots/BOT_ID/charts/conversion \
  -H "Authorization: Bearer TOKEN"
```

**Resposta esperada:**
```json
{
  "data": {
    "started": 150,
    "generated_pix": 60,
    "paid": 25,
    "failed": 5
  },
  "period": "Últimos 30 dias"
}
```

---

## ✅ Checklist de Testes

### Fase 2.1 - Configuração
- [ ] Obter configuração retorna dados corretos
- [ ] Atualizar canal valida ID Telegram
- [ ] Erro ao atualizar com canal inválido (400)
- [ ] Atualizar mensagem de boas-vindas funciona
- [ ] Atualizar mídia com URL válida funciona
- [ ] Erro ao atualizar mídia com URL inválida (400)
- [ ] Testar webhook retorna sucesso/erro
- [ ] Registrar webhook configura no Telegram

### Fase 2.2 - Planos
- [ ] Criar plano cria com sucesso (201)
- [ ] Validação: nome é obrigatório
- [ ] Validação: dias > 0
- [ ] Validação: preço >= 0
- [ ] Listar planos retorna em ordem de prioridade
- [ ] Listar planos ordenado corretamente
- [ ] Obter plano específico funciona
- [ ] Atualizar plano funciona
- [ ] Deletar plano funciona
- [ ] Marcar como padrão funciona
- [ ] Obter plano padrão funciona
- [ ] Múltiplos planos por bot funcionam
- [ ] Multi-tenant: usuário A não pode ver/editar planos de usuário B

### Fase 3.1 - Métricas
- [ ] Métricas com últimos 30 dias funciona
- [ ] Métricas com dias customizado funciona
- [ ] Métricas com range de datas funciona
- [ ] Listar leads retorna dados corretos
- [ ] Filtrar leads por status funciona
- [ ] Buscar leads por username funciona
- [ ] Paginação de leads funciona
- [ ] Detalhes de lead inclui pagamentos e interações
- [ ] Gráfico de receita retorna array de valores
- [ ] Gráfico de conversão retorna breakdown de status
- [ ] Multi-tenant: usuário A não vê métricas de bot de usuário B

---

## 🚀 Teste End-to-End Completo

### Passo 1: Setup
```bash
# 1. Criar usuário
USER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha123456"
  }')

TOKEN=$(echo $USER_RESPONSE | jq -r '.token')
echo "Token: $TOKEN"

# 2. Obter ID do bot criado
BOTS=$(curl -s -X GET http://localhost:3000/api/bots \
  -H "Authorization: Bearer $TOKEN")

BOT_ID=$(echo $BOTS | jq -r '.bots[0].id')
echo "Bot ID: $BOT_ID"
```

### Passo 2: Configurar
```bash
# Configurar canal
curl -X POST http://localhost:3000/api/bots/$BOT_ID/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "channelId": "-3966757980",
    "welcomeMessage": "Bem-vindo!"
  }'
```

### Passo 3: Criar Planos
```bash
# Plano 7 dias
curl -X POST http://localhost:3000/api/bots/$BOT_ID/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "7 Dias",
    "days": 7,
    "price": 19.90,
    "priority": 0
  }'

# Plano 30 dias
curl -X POST http://localhost:3000/api/bots/$BOT_ID/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "30 Dias",
    "days": 30,
    "price": 49.90,
    "priority": 1
  }'
```

### Passo 4: Ver Métricas
```bash
curl -X GET http://localhost:3000/api/bots/$BOT_ID/metrics \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 Notas

- Todas as rotas de config, planos e métricas requerem autenticação (JWT)
- Multi-tenant: cada usuário só vê seus próprios bots e dados
- Campos obrigatórios variam por endpoint (veja cada seção)
- Datas podem ser passadas em ISO format: `2026-06-07T14:30:00Z`
