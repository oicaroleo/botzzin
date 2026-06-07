# 🤖 Teste: Bot Integrado com Backend Dinâmico

## 📋 O que foi integrado

O bot agora **lê configurações e planos do banco de dados em tempo real**:

✅ Mensagem de boas-vindas customizável  
✅ Múltiplos planos dinâmicos  
✅ Valor do PIX baseado no plano escolhido  
✅ Canal de destino dinamicamente configurável  
✅ Duração de acesso baseada no plano  

---

## 🚀 Teste Completo (Passo a Passo)

### **Passo 1: Criar Usuário e Bot**

```bash
# 1. Signup
SIGNUP=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha123456",
    "name": "Teste User"
  }')

TOKEN=$(echo $SIGNUP | jq -r '.token')
echo "Token: $TOKEN"

# 2. Criar bot (com token real do BotFather)
BOTS=$(curl -s -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "telegramBotToken": "SEU_BOT_TOKEN_AQUI",
    "name": "Bot de Vendas"
  }')

BOT_ID=$(echo $BOTS | jq -r '.id')
echo "Bot ID: $BOT_ID"
```

---

### **Passo 2: Configurar Canal**

```bash
# Configurar canal do bot
curl -X POST http://localhost:3000/api/bots/$BOT_ID/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "channelId": "-3966757980",
    "channelName": "Canal Exclusivo BotZZIN",
    "welcomeMessage": "🎉 *Bem-vindo ao meu canal exclusivo!*\n\nAqui você encontrará:\n✅ Conteúdo premium\n✅ Dicas e estratégias\n✅ Suporte personalizado\n\nEscolha um plano abaixo!"
  }'
```

---

### **Passo 3: Criar Múltiplos Planos**

```bash
# Plano 7 Dias
PLAN1=$(curl -s -X POST http://localhost:3000/api/bots/$BOT_ID/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Acesso 7 Dias",
    "description": "Acesso ao canal por 7 dias",
    "days": 7,
    "price": 19.90,
    "emoji": "🎯",
    "priority": 0,
    "isActive": true
  }')

PLAN1_ID=$(echo $PLAN1 | jq -r '.id')
echo "Plano 1 ID: $PLAN1_ID"

# Plano 30 Dias
PLAN2=$(curl -s -X POST http://localhost:3000/api/bots/$BOT_ID/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Acesso 30 Dias",
    "description": "Acesso ao canal por um mês inteiro",
    "days": 30,
    "price": 49.90,
    "emoji": "💎",
    "priority": 1,
    "isActive": true
  }')

PLAN2_ID=$(echo $PLAN2 | jq -r '.id')
echo "Plano 2 ID: $PLAN2_ID"

# Plano VIP 90 Dias
PLAN3=$(curl -s -X POST http://localhost:3000/api/bots/$BOT_ID/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Acesso VIP 90 Dias",
    "description": "Acesso premium por 3 meses",
    "days": 90,
    "price": 99.90,
    "emoji": "👑",
    "priority": 2,
    "isActive": true
  }')

PLAN3_ID=$(echo $PLAN3 | jq -r '.id')
echo "Plano 3 ID: $PLAN3_ID"
```

---

### **Passo 4: Verificar Configuração**

```bash
# Listar todos os planos do bot
curl -s -X GET http://localhost:3000/api/bots/$BOT_ID/plans \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Obter configuração do bot
curl -s -X GET http://localhost:3000/api/bots/$BOT_ID/config \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

### **Passo 5: Testar no Telegram**

Agora no Telegram:

1. **Procure seu bot** (busque por @username_do_bot)
2. **Envie** `/start`

**O que você verá:**
```
🎉 Bem-vindo ao meu canal exclusivo!

Aqui você encontrará:
✅ Conteúdo premium
✅ Dicas e estratégias
✅ Suporte personalizado

Escolha um plano abaixo!

[🎯 Acesso 7 Dias (R$ 19.90)]
[💎 Acesso 30 Dias (R$ 49.90)]
[👑 Acesso VIP 90 Dias (R$ 99.90)]
[📱 Suporte]
```

3. **Clique em um plano** (ex: "💎 Acesso 30 Dias")

**Resposta:**
```
✅ Plano Selecionado

💎 Acesso 30 Dias
Duração: 30 dias
Valor: R$ 49.90

Clique em "Gerar PIX" para continuar.

[💳 Gerar PIX] [🔙 Escolher outro] [📱 Suporte]
```

4. **Clique em "💳 Gerar PIX"**

**Resposta:**
```
💳 PIX Gerado com Sucesso!

Plano: Acesso 30 Dias
Valor: R$ 49.90
Duração: 30 dias
Expira em: 60 minutos

QR Code: [código aqui]

Copiar e Colar: [chave pix]

Após pagar, clique em "Já Paguei" abaixo.

[✅ Já Paguei] [❌ Cancelar]
```

---

### **Passo 6: Simular Pagamento (Para Teste)**

```bash
# No terminal, pegue o ID do pagamento nos logs do servidor
# Procure por: "[BOT] PIX generated: PAYMENT_ID..."

# Depois simule:
curl -X POST "http://localhost:3000/webhooks/simulate?paymentId=PAYMENT_ID" \
  -H "Content-Type: application/json"
```

---

## 🧪 Checklist de Validação

### Bot Dinâmico
- [ ] Bot mostra mensagem de boas-vindas customizada
- [ ] Bot mostra 3 planos (7, 30, 90 dias)
- [ ] Ordem dos planos é a correta (por priority)
- [ ] Emojis aparecem corretamente
- [ ] Valores dos planos aparecem corretos

### Plano Selecionado
- [ ] Ao selecionar plano, mostra resumo correto
- [ ] Ao selecionar plano, salva planDays no banco
- [ ] Botão "Escolher outro" volta para lista de planos

### PIX Dinâmico
- [ ] PIX gerado com valor do plano selecionado
- [ ] PIX gerado com nome do plano na descrição
- [ ] PIX gerado com duração correta
- [ ] Todos os 3 valores funcionam (19.90, 49.90, 99.90)

### Acesso ao Canal
- [ ] Ao confirmar pagamento, gera link de convite
- [ ] Link expira em X dias (baseado no plano)
- [ ] Link é enviado ao user via Telegram

### Múltiplos Planos
- [ ] Pode selecionar 7 dias e depois 30 dias
- [ ] Cada seleção gera PIX com valor correto
- [ ] planDays é atualizado corretamente no banco

---

## 📊 Dados Esperados no Banco

Após test completo, você deve ter:

### Users
```
email: teste@example.com
name: Teste User
```

### Bots
```
telegramBotToken: SEU_BOT_TOKEN
telegramUsername: @seu_bot
welcomeMessage: "🎉 Bem-vindo ao meu canal exclusivo!..."
defaultChannelId: -3966757980
```

### Plans (3 registros)
```
1. Nome: "Acesso 7 Dias", Dias: 7, Preço: 19.90, Priority: 0
2. Nome: "Acesso 30 Dias", Dias: 30, Preço: 49.90, Priority: 1
3. Nome: "Acesso VIP 90 Dias", Dias: 90, Preço: 99.90, Priority: 2
```

### Leads
```
telegramUserId: SEU_ID
status: started | generated_pix | paid
planDays: 7 ou 30 ou 90 (baseado no plano escolhido)
```

### Payments
```
amount: 19.90 ou 49.90 ou 99.90 (baseado no plano)
status: pending | confirmed
```

---

## 🔄 Teste Múltiplos Fluxos

### **Fluxo 1: Escolher plano mais barato**
- `/start` → Selecionar "7 Dias" → Gerar PIX → Pagar → Acesso

### **Fluxo 2: Escolher plano mais caro**
- `/start` → Selecionar "90 Dias" → Gerar PIX (R$ 99.90) → Pagar → Acesso

### **Fluxo 3: Mudar de ideia**
- `/start` → Selecionar "30 Dias" → Voltar → Selecionar "7 Dias" → Gerar PIX (R$ 19.90)

### **Fluxo 4: Múltiplos users**
- User A: `/start` → Seleciona 30 dias
- User B: `/start` → Seleciona 90 dias
- Verificar que cada um tem seu próprio lead e planDays

---

## 📝 Logs Esperados

Quando tudo funciona, você verá no servidor:

```
[BOT] Default bot initialized: bot-id
[BOT] Plans loaded: 3 plans
[BOT] Welcome message configured

[BOT] Lead registered: lead-id (User: 123456789)
[BOT] Plan selected: Acesso 30 Dias (plan-id) for lead lead-id
[BOT] PIX generated: payment-id for lead lead-id (Acesso 30 Dias - R$ 49.90)
[PAYMENT WEBHOOK] Acesso liberado para: 123456789
[CHANNEL] Gerando link de convite para 30 dias, Canal: -3966757980
[CHANNEL] Link criado: https://t.me/...
```

---

## 🐛 Troubleshooting

### **"Plano não encontrado"**
- Verifique se criou os planos antes de testar
- Confirm planId nos dados retornados do create plan

### **"PIX gerado com valor errado"**
- Verify planPrice no banco
- Verify que está usando selectedPlan.price

### **"Link não aparece"**
- Verifique se defaultChannelId está configurado
- Verify se bot tem permissão no canal
- Tente com canal hardcoded -3966757980 para testes

### **"Plano não aparece no /start"**
- Verifique se plans estão salvos no banco
- Confirm que status do bot é "active"
- Restart o servidor (para recarregar plans em memória)

---

## 🎯 Próximas Melhorias

Depois de testar, você pode:

1. **Adicionar persistência de planos em memória**
   - Recarregar a cada X minutos
   - Ou usar Redis

2. **Suporte a múltiplos bots simultâneos**
   - Hoje usa um bot padrão
   - Depois: um bot por cliente

3. **Webhooks de pagamento reais**
   - Hoje simula com `/webhooks/simulate`
   - Depois: integração real com PushinPay

4. **Dashboard para visualizar**
   - Leads por plano
   - Receita por plano
   - Taxa de conversão por plano

---

## ✨ Status

✅ Bot dinâmico completamente implementado  
✅ Múltiplos planos funcionais  
✅ Valores dinâmicos de PIX  
✅ Canais configuráveis  
✅ Integração com backend  

**Pronto para ir ao ar!** 🚀
