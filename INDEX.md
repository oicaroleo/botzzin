# 📋 Índice de Documentação — BotZZIN

## 🚀 Comece Aqui

| Documento | Para Quem | Tempo |
|-----------|-----------|-------|
| [FIRST_STEPS.md](./FIRST_STEPS.md) | Desenvolvedores (setup local) | 15 min |
| [README.md](./README.md) | Visão geral do projeto | 5 min |
| [ARCHITECTURE_PHASE1.md](./ARCHITECTURE_PHASE1.md) | Entender a tecnologia | 10 min |
| [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) | Colocar em produção | 20 min |

---

## 📁 Estrutura do Projeto

```
BOTZZIN/
├── apps/bot/                     ← Bot Engine (PHASE 1)
│   ├── src/
│   │   ├── index.ts              ← Entry point
│   │   ├── config.ts             ← Vars de env
│   │   ├── bot.ts                ← Lógica do bot (grammY)
│   │   ├── server.ts             ← Servidor Fastify + webhook
│   │   └── handlers/             ← Handlers específicos (prep Fase 2)
│   ├── package.json
│   └── tsconfig.json
│
├── packages/                     ← Libs compartilhadas (prep Fase 2)
│
├── Dockerfile                    ← Deploy em Docker
├── docker-compose.yml            ← Dev com containers
├── package.json                  ← Monorepo root
├── pnpm-workspace.yaml          ← Config pnpm
├── .env.example                 ← Template de variáveis
├── setup.sh                      ← Setup automático (Linux/Mac)
├── setup.ps1                     ← Setup automático (Windows)
│
└── Documentação
    ├── README.md                 ← Visão geral
    ├── FIRST_STEPS.md            ← Como começar
    ├── ARCHITECTURE_PHASE1.md    ← Entender o sistema
    ├── DEPLOY_GUIDE.md           ← Como fazer deploy
    └── INDEX.md                  ← Este arquivo
```

---

## 🎯 Fases do Projeto

### ✅ Fase 1: Bot Engine (AGORA)
- [x] Estrutura monorepo
- [x] Bot básico com grammY
- [x] Webhook handler com Fastify
- [x] Fluxo de boas-vindas
- [x] PIX simulado
- [x] Documentação

**Status**: Pronto para testar localmente  
**Próximo**: `pnpm install && pnpm dev`

---

### 🔜 Fase 2: Persistência + Gateway Real
**O que será adicionado:**
- PostgreSQL + Prisma
- Integração PushinPay/SyncPay
- Webhook de confirmação de pagamento
- Liberação de grupo/canal real
- Editor visual de fluxos (API)

**Tempo estimado**: 2-3 semanas

---

### 🔜 Fase 3: Dashboard + Métricas
**O que será adicionado:**
- Dashboard Next.js
- Métricas de conversão
- Área de leads
- Timeline por lead
- Comprovante de entrega

**Tempo estimado**: 2 semanas

---

### 🔜 Fase 4: Remarketing + Assinaturas
**O que será adicionado:**
- BullMQ para filas
- Segmentação de leads
- Disparos em massa
- Assinaturas recorrentes
- Renovação automática

**Tempo estimado**: 2 semanas

---

## 📚 Stack Técnico

```
Frontend (Fase 3)
├─ Next.js 15
├─ TypeScript
├─ Tailwind CSS
├─ shadcn/ui

Backend (Agora)
├─ Node.js + TypeScript
├─ Fastify (servidor)
├─ grammY (bot Telegram)
├─ Axios (HTTP)

Banco de Dados (Fase 2)
├─ PostgreSQL
├─ Prisma ORM

Cache/Fila (Fase 4)
├─ Redis
├─ BullMQ

Infra
├─ Docker
├─ Railway/Render/VPS
├─ ngrok (dev local)
```

---

## 🔗 Links Importantes

| Recurso | URL |
|---------|-----|
| Telegram Bot API | https://core.telegram.org/bots |
| grammY Docs | https://grammy.dev |
| Fastify Docs | https://www.fastify.io |
| Railway | https://railway.app |
| Render | https://render.com |
| ngrok | https://ngrok.com |

---

## 🚀 Quick Commands

### Setup & Desenvolvimento
```bash
# Setup automático
./setup.sh              # Linux/Mac
.\setup.ps1             # Windows

# Instalar dependências
pnpm install

# Rodar em desenvolvimento
pnpm dev

# Type-check
pnpm type-check

# Build para produção
pnpm build

# Rodar em produção
pnpm start
```

### Docker
```bash
# Build
docker build -t botzzin:latest .

# Rodar
docker run -d --env-file .env -p 3000:3000 botzzin:latest

# Logs
docker logs -f <container_id>
```

### ngrok (Webhooks locais)
```bash
ngrok http 3000
# Copiar URL gerada para WEBHOOK_URL no .env
```

---

## 📞 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| "Token não configurado" | Copie `.env.example` → `.env` e adicione token |
| Bot não responde | Verifique se `pnpm dev` está rodando |
| Webhook não funciona | Use ngrok e atualize `WEBHOOK_URL` |
| "cannot find module" | Execute `pnpm install` |

---

## 🎯 Próximo Passo

```bash
# 1. Setup
./setup.sh                    # ou .\setup.ps1 no Windows

# 2. Adicione suas variáveis ao .env
nano .env

# 3. Instale ngrok (para testes local com webhook)
brew install ngrok            # ou sua package manager

# 4. Rodar ngrok
ngrok http 3000              # Copie a URL

# 5. Atualize WEBHOOK_URL no .env com a URL do ngrok

# 6. Inicie o servidor
pnpm dev

# 7. Teste no Telegram
# Procure por seu bot e envie /start
```

---

## 💬 Precisa de Ajuda?

1. Leia [FIRST_STEPS.md](./FIRST_STEPS.md)
2. Verifique [ARCHITECTURE_PHASE1.md](./ARCHITECTURE_PHASE1.md)
3. Consulte logs: `pnpm dev` mostrará erros
4. Verifique `.env` — 90% dos erros vêm daqui

---

## 📝 Status do Projeto

| Item | Status | Pronto? |
|------|--------|---------|
| Estrutura base | ✅ Completo | Sim |
| Bot Engine | ✅ Completo | Sim |
| PIX simulado | ✅ Completo | Sim |
| Documentação | ✅ Completo | Sim |
| Deploy | ✅ Documentado | Sim (Railway) |
| Banco de dados | ⏳ Fase 2 | Não |
| Dashboard | ⏳ Fase 3 | Não |
| Métricas | ⏳ Fase 3 | Não |

---

**Versão**: 0.1.0  
**Data**: Junho 2026  
**Última atualização**: Hoje  

🚀 Pronto para começar? Leia [FIRST_STEPS.md](./FIRST_STEPS.md)!
