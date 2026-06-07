# Arquitetura — Fase 1: Bot Engine

## 🏗 Diagrama de Fluxo

```
┌─────────────────┐
│   Usuário no    │
│    Telegram     │
└────────┬────────┘
         │ /start
         ▼
    ┌────────────┐
    │  grammY    │  
    │   Bot      │
    └────┬───────┘
         │ Comanda handlers
         ▼
┌────────────────────────┐
│  Bot Handlers          │
├────────────────────────┤
│ • /start              │
│ • generate_pix        │
│ • confirm_payment     │
│ • support             │
└────────┬───────────────┘
         │ HTTP response
         ▼
┌────────────────────────┐
│ Telegram API           │
│ (envia mensagem)       │
└────────┬───────────────┘
         │
         ▼
    Usuário vê
    mensagem
```

---

## 🔌 Webhook Flow (Telegram → Seu Servidor)

```
1. User clica no bot no Telegram
   ▼
2. Telegram envia POST /webhook com update_id
   {
     "update_id": 12345,
     "message": {
       "message_id": 1,
       "from": { "id": 123456789, "first_name": "João" },
       "chat": { "id": 123456789 },
       "text": "/start"
     }
   }
   ▼
3. Seu servidor (Fastify) recebe em /webhook
   ▼
4. grammY processa e rota para handler correto
   ▼
5. Handler envia resposta via bot.api.sendMessage()
   ▼
6. Telegram entrega mensagem ao user
```

---

## 📦 Stack Atual

```
Node.js + TypeScript
    │
    ├─ Fastify (servidor HTTP)
    │  └─ POST /webhook (recebe updates do Telegram)
    │  └─ POST /admin/setup-webhook (registra webhook)
    │  └─ GET /health, /info
    │
    └─ grammY (bot framework)
       └─ Handlers
          ├─ /start
          ├─ Callbacks (generate_pix, confirm_payment, etc)
          └─ Error handler
```

---

## 🎯 O que Funciona Agora

✅ Bot responde `/start` com teclado inline  
✅ Botão "Gerar PIX" simula pagamento  
✅ Fluxo completo: start → PIX → confirmação  
✅ Logs de cada ação  
✅ Configuração por .env  

---

## 🚧 O que Falta para Fase 2

❌ Persistência (banco de dados)  
❌ Integração real com gateway de pagamento  
❌ Webhook de confirmação do gateway  
❌ Liberação real de grupo/canal  
❌ Métricas e tracking de lead  
❌ Multi-tenant (múltiplos bots por usuário)  

---

## 🔐 Segurança (Fase 1)

⚠️ PIX é simulado (apenas para teste)  
⚠️ Sem validação de pagamento  
⚠️ Sem banco de dados (tudo em memória)  

→ **NUNCA USAR EM PRODUÇÃO AGORA**

---

## 📊 Exemplo de Fluxo Completo

```
1️⃣ Usuário (João):
   /start

2️⃣ Bot responde:
   👋 Bem-vindo ao BotZZIN!
   [💳 Gerar PIX] [📱 Suporte]

3️⃣ João clica em "💳 Gerar PIX"

4️⃣ Bot responde:
   💳 PIX Gerado
   Valor: R$ 19.90
   Expira em: 60 minutos
   
   QR Code: ...
   Copiar: ...
   
   [✅ Já Paguei] [❌ Cancelar]

5️⃣ João clica em "✅ Já Paguei"

6️⃣ Bot responde:
   ✅ Pagamento Confirmado!
   Seu acesso foi liberado. 🎉

7️⃣ Logs no servidor:
   [BOT] Start command from user 123456789 in chat 123456789
   [BOT] PIX generated for user 123456789
   [BOT] Payment confirmed for user 123456789
```

---

## 💾 Dados em Memória (Fase 1)

Como não temos banco de dados ainda, tudo é perdido quando o servidor reinicia:
- Histórico de PIX gerados
- Status de pagamentos
- Dados do usuário

→ **Fase 2**: Adicionar Prisma + PostgreSQL para persistência

---

## 🚀 Próximas Integrações

### Fase 2 — Gateway de Pagamento

```
Bot gera PIX → Chama PushinPay API
              ↓
         Cria transação
              ↓
         Retorna QR Code + Copy-Paste
              ↓
         (User paga no seu banco)
              ↓
         PushinPay envia webhook confirmando
              ↓
         Seu servidor valida e libera acesso
```

---

## 📝 Estrutura de Handlers (Preparação para Fase 2)

```
src/
├── handlers/
│   ├── payment.handler.ts      # Futura: PushinPay webhook
│   ├── group.handler.ts         # Futura: Adicionar/remover de grupo
│   ├── remarketing.handler.ts   # Futura: Disparos em massa
│   └── metrics.handler.ts       # Futura: Rastrear eventos
│
├── services/
│   ├── gateway.service.ts       # Futura: PushinPay/SyncPay API
│   ├── group.service.ts         # Futura: Gerenciar membros
│   └── lead.service.ts          # Futura: Banco de dados
│
└── types/
    ├── user.ts
    ├── payment.ts
    └── flow.ts
```

---

## ✅ Checklist para Ir para Produção (Fase 2+)

- [ ] Integração real com PushinPay/SyncPay
- [ ] PostgreSQL + Prisma migração
- [ ] Validação de webhook do gateway
- [ ] Liberação de grupo/canal real
- [ ] Rate limiting (não flodar Telegram)
- [ ] Tratamento de erro robusto
- [ ] Monitoring e logging
- [ ] Testes automatizados
- [ ] Backup do banco
- [ ] HTTPS obrigatório
- [ ] Autenticação do admin dashboard
