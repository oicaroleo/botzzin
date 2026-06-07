# BotZZIN — SaaS de Administração de Bots Telegram

Plataforma SaaS para gerenciar bots Telegram com automação de vendas, pagamentos e métricas.

## 🚀 Quick Start

### Pré-requisitos
- Node.js >= 18.0
- pnpm >= 9.0

### 1. Instalar dependências
```bash
pnpm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
```

Edite `.env` e adicione:
- `TELEGRAM_BOT_TOKEN`: Token do seu bot (obtenha com @BotFather no Telegram)
- `WEBHOOK_URL`: URL pública do seu servidor (ex: https://seu-dominio.com)

### 3. Rodar em desenvolvimento
```bash
pnpm dev
```

O servidor iniciará em `http://localhost:3000`

### 4. Registrar webhook do Telegram
Com o servidor rodando, execute em outro terminal:
```bash
curl -X POST http://localhost:3000/admin/setup-webhook
```

Resposta esperada:
```json
{
  "success": true,
  "webhookUrl": "https://seu-dominio.com/webhook",
  "message": "Webhook registrado com sucesso!"
}
```

### 5. Testar o bot
- Encontre seu bot no Telegram (busque por @seu_username)
- Envie `/start`
- Clique em "💳 Gerar PIX"
- Teste a jornada completa

---

## 📁 Estrutura do Projeto

```
BOTZZIN/
├── apps/
│   └── bot/                    # Bot Engine (Fase 1)
│       ├── src/
│       │   ├── index.ts        # Entry point
│       │   ├── config.ts       # Configurações
│       │   ├── bot.ts          # Lógica do bot (grammY)
│       │   ├── server.ts       # Servidor Fastify + webhook
│       │   └── handlers/       # Handlers específicos (Fase 2+)
│       ├── package.json
│       └── tsconfig.json
├── packages/                   # Bibliotecas compartilhadas (Fase 2)
├── package.json                # Root monorepo
└── pnpm-workspace.yaml         # Config pnpm workspaces
```

---

## 🔄 Roadmap

### Fase 1 ✅ (Atual)
- [x] Setup monorepo
- [x] Bot Engine com grammY
- [x] Fluxo de boas-vindas
- [x] Geração de PIX simulado
- [ ] Integração com PushinPay (webhook)
- [ ] Liberação de canal/grupo após pagamento

### Fase 2 (Próxima)
- [ ] Prisma + PostgreSQL (persistência)
- [ ] Editor visual de fluxos (API)
- [ ] Suporte a mais gateways (SyncPay, Mercado Pago)
- [ ] Cache de mídia em canal privado

### Fase 3
- [ ] Dashboard Next.js (métricas básicas)
- [ ] Área de leads com timeline
- [ ] Comprovante de entrega auditável

### Fase 4
- [ ] BullMQ para filas de remarketing
- [ ] Segmentação de leads
- [ ] Assinaturas recorrentes

---

## 📊 Endpoints Disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Health check |
| GET | `/info` | Informações do bot |
| POST | `/webhook` | Webhook do Telegram (automático) |
| POST | `/admin/setup-webhook` | Registrar webhook |

---

## 🛠 Desenvolvimento

### Rodar linter/type-check
```bash
pnpm type-check
```

### Build para produção
```bash
pnpm build
```

### Rodar servidor em produção
```bash
pnpm start
```

---

## 🐛 Troubleshooting

**Erro: `TELEGRAM_BOT_TOKEN não configurado`**
- Verifique se o arquivo `.env` existe
- Copie `.env.example` → `.env`
- Adicione seu token do @BotFather

**Erro: `WEBHOOK_URL não configurado`**
- Você precisa de um domínio/URL pública
- Para desenvolvimento local, use [ngrok](https://ngrok.com) ou similar

**Webhook não funciona**
- Verifique se o servidor está rodando
- Execute `/admin/setup-webhook` manualmente
- Confirme que a URL é acessível publicamente

---

## 📝 Notas Técnicas

- **Bot Framework**: grammY (melhor para TypeScript)
- **Server**: Fastify (alta performance)
- **Webhook**: Telegram API → POST /webhook
- **Multi-tenant**: Preparado para múltiplos bots por usuário (Fase 2)

---

## 📄 Licença

Proprietary — BotZZIN 2026
