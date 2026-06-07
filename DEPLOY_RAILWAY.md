# 🚀 Deploy em Railway - Guia Completo

## 📋 Pré-requisitos

- [ ] Conta GitHub
- [ ] Repositório Git com código
- [ ] Conta Railway (gratuita em https://railway.app)

---

## 🎯 Plano de Deploy

```
1. Criar conta em Railway (5 min)
2. Conectar repositório GitHub (5 min)
3. Configurar variáveis de ambiente (10 min)
4. Criar banco de dados PostgreSQL (5 min)
5. Deploy automático (5 min)
6. Testar em produção (10 min)
7. Configurar domínio (5 min)

Total: ~45 minutos
```

---

## ✅ Passo 1: Conta Railway

1. Acesse https://railway.app
2. Clique em "Sign in" → "Sign in with GitHub"
3. Autorize Railway no GitHub
4. Crie um novo projeto

---

## ✅ Passo 2: Conectar Repositório

### Opção A: Se o código está no GitHub

1. Em Railway, clique em "New Project"
2. Selecione "GitHub Repo"
3. Autorize Railway a acessar seu GitHub
4. Escolha o repositório `BOTZZIN`
5. Clique em "Deploy"

### Opção B: Se o código está local

1. Inicialize Git no diretório:
```bash
cd C:\BOTZZIN
git init
git add .
git commit -m "Initial commit"
```

2. Crie repositório vazio no GitHub:
   - Acesse https://github.com/new
   - Nome: `botzzin`
   - Não inicialize com README
   - Clique "Create repository"

3. Faça push:
```bash
git remote add origin https://github.com/SEU_USUARIO/botzzin.git
git branch -M main
git push -u origin main
```

4. Em Railway, conecte como Opção A acima

---

## ✅ Passo 3: Variáveis de Ambiente

No painel do Railway:

1. Vá para aba "Variables"
2. Adicione cada uma (clique em "+ New Variable"):

```
TELEGRAM_BOT_TOKEN=SEU_TOKEN_AQUI
NODE_ENV=production
PORT=3000
JWT_SECRET=seu_secret_bem_comprido_aleatorio
PUSHPAY_API_KEY=sua_key_aqui
DATABASE_URL=postgresql://... (será preenchido por Railway)
WEBHOOK_URL=https://seu-app.railway.app
```

**Sobre WEBHOOK_URL:**
- Railway gera um domínio automático
- Formato: `https://seu-app-production.up.railway.app`
- Você verá qual é depois do primeiro deploy

---

## ✅ Passo 4: Banco de Dados PostgreSQL

1. No painel do Railway, clique em "+ Create"
2. Selecione "Database" → "PostgreSQL"
3. Railway vai:
   - Criar banco automático
   - Preencher `DATABASE_URL` automaticamente
   - Estar pronto em 2 minutos

---

## ✅ Passo 5: Configurar Build

Railway deve detectar automaticamente, mas se não:

1. No seu repositório, crie `.railwayrc` (já criei como `railway.json`)
2. Railway vai detectar `pnpm` e Node.js

Se der erro de build:
- Vá para "Settings" → "Builder"
- Selecione "Nixpacks"
- Build command: `pnpm install && pnpm build`
- Start command: `pnpm --filter @botzzin/bot start`

---

## ✅ Passo 6: Fazer Deploy

1. No painel, clique em "Deploy"
2. Railway vai:
   - Clonar código do GitHub
   - Instalar dependências
   - Rodar migrations Prisma
   - Iniciar servidor

**Você verá logs em tempo real** - procure por:
```
[SUCCESS] Application deployed
Server listening at ...
```

Se der erro:
1. Clique em "Logs"
2. Veja qual é o erro
3. Corrija e faça `git push` novamente
4. Railway vai fazer redeploy automático

---

## ✅ Passo 7: Encontrar URL de Produção

1. No painel, vá para "Settings"
2. Procure por "Domains"
3. Você verá: `seu-app-production.up.railway.app`
4. Copie essa URL

**Exemplo:** `https://botzzin-production.up.railway.app`

---

## ✅ Passo 8: Atualizar Variáveis

Volta para "Variables" e atualize:

```
WEBHOOK_URL=https://seu-app-production.up.railway.app
```

Railway vai refazer o deploy automaticamente.

---

## ✅ Passo 9: Testar em Produção

### Teste 1: Health Check
```bash
curl https://seu-app-production.up.railway.app/health
```

Resposta esperada:
```json
{"status":"ok"}
```

### Teste 2: Info do Bot
```bash
curl https://seu-app-production.up.railway.app/info
```

Resposta esperada:
```json
{
  "botUsername": "@seu_bot",
  "botId": 123456789,
  "environment": "production",
  "port": 3000
}
```

### Teste 3: Signup
```bash
curl -X POST https://seu-app-production.up.railway.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha123456",
    "name": "Teste"
  }'
```

Se respondeu com `token`, está funcionando! ✅

### Teste 4: No Telegram

1. No `@BotFather`, edite o bot
2. Vá em "Edit Webhook"
3. Coloque: `https://seu-app-production.up.railway.app/webhook`
4. No Telegram, procure seu bot
5. Envie `/start`
6. Deve responder normalmente

---

## ✅ Passo 10: Domínio Customizado (Opcional)

Se quer domínio tipo `bot.suaempresa.com`:

1. Compre domínio (GoDaddy, Namecheap, etc)
2. Em Railway, vá para "Settings" → "Domains"
3. Clique "Add Custom Domain"
4. Coloque seu domínio
5. Railway vai gerar DNS records
6. Configure no seu provedor de domínio
7. Espere ~5-10 minutos para propagar

---

## 🔄 Updates em Produção

Depois que tudo está online:

1. Faça mudanças no código local
2. Commit e push para GitHub:
```bash
git add .
git commit -m "Descrição da mudança"
git push origin main
```

3. Railway detecta mudança automaticamente
4. Faz rebuild e redeploy
5. Você acompanha pelos logs

**Sem downtime entre redeployments!**

---

## 📊 Plano Gratuito Railway

```
Incluso por mês (gratuito):
✅ $5 em créditos
✅ 1 banco de dados PostgreSQL
✅ 1 aplicação Node.js
✅ 512MB RAM
✅ Compartilhado

Depois de esgotar:
💰 Pago por uso (~$0.50/GB de RAM/mês)
```

**Para MVP com amigos: totalmente gratuito!**

---

## 🐛 Troubleshooting

### "Build failed"
- Clique em "Logs"
- Procure por `ERROR` ou `failed`
- Geralmente é falta de variável de ambiente

### "Cannot find database"
- Verifique se PostgreSQL foi criado
- Verifique se `DATABASE_URL` foi preenchido
- Tente rodar migrations manualmente

### "Webhook error 403"
- Verifique se `TELEGRAM_BOT_TOKEN` está correto
- Verifique se `WEBHOOK_URL` está atualizado
- Tente atualizar webhook no BotFather

### "Timeout ao enviar mensagem"
- Bot pode estar rodando em container pequeno
- Railway vai escalar automaticamente com uso

---

## ✅ Checklist Final

- [ ] Repositório no GitHub
- [ ] Conta Railway criada
- [ ] Projeto conectado ao repositório
- [ ] PostgreSQL criado
- [ ] Variáveis de ambiente preenchidas
- [ ] Deploy concluído
- [ ] Testes passaram
- [ ] Webhook atualizado no BotFather
- [ ] Domínio customizado (opcional)
- [ ] Documentado em PRODUCTION.md

---

## 📝 Documentação Pós-Deploy

Crie arquivo `PRODUCTION.md` para referência:

```markdown
# Produção - BotZZIN

## URLs
- API: https://seu-app-production.up.railway.app
- Bot: @seu_bot
- Dashboard: https://seu-dashboard-production.up.railway.app (depois)

## Variáveis Críticas
- TELEGRAM_BOT_TOKEN: Manter seguro!
- JWT_SECRET: Manter seguro!
- DATABASE_URL: Gerada pelo Railway

## Logs
- Railway Dashboard → Logs
- Buscar por [BOT], [ERROR], [WEBHOOK]

## Rollback
- Clique em deployment anterior em Railway
- Redeploy automático

## Contato
- Suporte Railway: https://railway.app/support
- Suporte Telegram: https://core.telegram.org/bots/faq
```

---

## 🎯 Próximo Passo

Depois que tudo está online:

1. ✅ Compartilhe link com amigos
2. ✅ Amigos testam o bot
3. ✅ Coleta feedback
4. ✅ Você começa dashboard em paralelo

**Estimado: 45 minutos até estar no ar!** ⚡
