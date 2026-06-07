# 🚀 Deploy em Railway - Passo a Passo SIMPLIFICADO

## 📋 Resumo Executivo

```
1. Repositório GitHub (5 min)
2. Push do código (5 min)
3. Conta Railway (5 min)
4. Conectar repositório (5 min)
5. Banco de dados PostgreSQL (5 min)
6. Variáveis de ambiente (5 min)
7. Deploy automático (5 min)
8. Testar em produção (5 min)

TOTAL: ~45 minutos até estar no ar! ✅
```

---

## 📌 PASSO 1: Criar Repositório GitHub

**O que fazer:**
1. Acesse https://github.com/new
2. Repository name: `botzzin`
3. **Não** clique em "Initialize with README"
4. Clique "Create repository"

**Resultado:** GitHub mostra a URL do repositório
- Formato: `https://github.com/SEU_USUARIO/botzzin.git`
- **COPIE ESSA URL** (você vai precisar)

---

## 📌 PASSO 2: Fazer Push do Código

**O que fazer (execute um por vez):**

```bash
# Comando 1:
git remote add origin https://github.com/SEU_USUARIO/botzzin.git

# Comando 2:
git branch -M main

# Comando 3:
git push -u origin main
```

**Quando pedir Password:**
- Não é sua senha do GitHub!
- Use **Personal Access Token**:
  1. GitHub → Settings → Developer settings → Personal access tokens
  2. "Generate new token"
  3. Selecione `repo` e `workflow`
  4. Copie o token
  5. Cole no terminal quando pedir "Password"

**Resultado:** Código está no GitHub ✅

---

## 📌 PASSO 3: Criar Conta Railway

**O que fazer:**
1. Acesse https://railway.app
2. Clique "Sign in with GitHub"
3. Autorize Railway
4. Crie um novo projeto

**Resultado:** Você está logado no Railway ✅

---

## 📌 PASSO 4: Conectar Repositório

**O que fazer:**
1. Em Railway, clique "+ New Project"
2. Selecione "GitHub Repo"
3. Clique "Configure GitHub App" (primeira vez)
4. Autorize Railway a acessar seus repositórios
5. Volta em Railway e selecione repositório `botzzin`
6. Railway começa a fazer build automaticamente

**Resultado:** Railway está fazendo build ✅

---

## 📌 PASSO 5: Criar Banco de Dados PostgreSQL

**O que fazer:**
1. No painel do Railway, clique "+ Create"
2. Selecione "Database" → "PostgreSQL"
3. Espere 2-3 minutos
4. Railway vai **automaticamente** preencher `DATABASE_URL`

**Resultado:** PostgreSQL criado e conectado ✅

---

## 📌 PASSO 6: Configurar Variáveis de Ambiente

**O que fazer:**
1. No painel do Railway, clique em "Variables"
2. Adicione cada uma clicando "+ New Variable":

```
TELEGRAM_BOT_TOKEN = SEU_TOKEN_DO_BOTFATHER
NODE_ENV = production
PORT = 3000
JWT_SECRET = sua_secret_super_aleatorio_e_longo_aqui
PUSHPAY_API_KEY = sua_key_do_pushpay
```

**IMPORTANTE:** 
- `DATABASE_URL` será preenchido automaticamente por Railway
- `WEBHOOK_URL` você descobre depois do primeiro deploy

**Resultado:** Variáveis configuradas ✅

---

## 📌 PASSO 7: Fazer Deploy

**O que fazer:**
1. No painel do Railway, clique "Deploy"
2. Railway vai:
   - Clonar código do GitHub
   - Instalar dependências (`pnpm install`)
   - Rodar migrations do Prisma
   - Iniciar servidor

**Acompanhe pelos logs:**
- Procure por: `[SUCCESS] Application deployed`
- Ou: `Server listening at ...`

**Resultado:** Aplicação no ar! ✅

**Se der erro:**
- Clique em "Logs" para ver o erro
- Procure por `ERROR`
- Corrija no código local
- `git push` novamente
- Railway refaz automaticamente

---

## 📌 PASSO 8: Encontrar URL de Produção

**O que fazer:**
1. No painel do Railway, vá para "Settings"
2. Procure "Domains"
3. Você verá algo como: `seu-app-production.up.railway.app`

**Exemplo:** `https://botzzin-production.up.railway.app`

---

## 📌 PASSO 9: Atualizar WEBHOOK_URL

**O que fazer:**
1. Volte para "Variables"
2. Edite `WEBHOOK_URL`:

```
WEBHOOK_URL = https://seu-app-production.up.railway.app
```

3. Railway refaz deploy automaticamente

---

## 📌 PASSO 10: Testar em Produção

**Teste 1 - Health Check:**
```bash
curl https://seu-app-production.up.railway.app/health
```

Resposta esperada:
```
{"status":"ok"}
```

**Teste 2 - Info:**
```bash
curl https://seu-app-production.up.railway.app/info
```

Deve retornar informações do bot.

**Teste 3 - No Telegram:**
1. No @BotFather, edite seu bot
2. "Edit Webhook"
3. Coloque: `https://seu-app-production.up.railway.app/webhook`
4. No Telegram, procure seu bot
5. Envie `/start`
6. Deve responder com os planos dinâmicos ✅

---

## 📌 PASSO 11: Compartilhar com Amigos

**O que fazer:**
1. Amigos vão no Telegram
2. Procuram seu bot: `@seu_bot`
3. Enviam `/start`
4. Escolhem um plano
5. Geram PIX
6. Você recolhe feedback! 🎯

---

## 🐛 Se Algo Der Errado

### Build falhou?
- Railway → Logs → procure por `ERROR`
- Geralmente é variável de ambiente faltando
- Volta em "Variables" e preenche

### Bot não responde no Telegram?
- Verifique se `TELEGRAM_BOT_TOKEN` está correto
- Verifique se `WEBHOOK_URL` está atualizado no BotFather
- Tente fazer novo push: `git push origin main`
- Railway refaz deploy

### PostgreSQL não conecta?
- Espere 5 minutos após criar (leva tempo)
- Clique "Logs" e procure por erro de conexão
- Tente reiniciar o serviço

---

## ✅ Checklist Final

- [ ] Repositório criado no GitHub
- [ ] Código feito push para GitHub
- [ ] Conta Railway criada
- [ ] Repositório conectado em Railway
- [ ] PostgreSQL criado
- [ ] Variáveis preenchidas
- [ ] Deploy concluído
- [ ] Testes passaram
- [ ] Webhook atualizado no BotFather
- [ ] Amigos testando o bot ✅

---

## 📊 Custo

**Plano Gratuito Railway:**
```
✅ $5/mês em créditos (gratuito)
✅ Inclui 1 PostgreSQL
✅ Inclui 1 aplicação Node.js
✅ Para MVP com amigos: 100% grátis!
```

---

## 🎯 Próximo Passo

Enquanto amigos testam o bot em produção, você:

1. ✅ Deploy concluído
2. ⏳ **Começar Dashboard (Next.js)**
   - Setup: 15 min
   - Auth: 30 min
   - Primeiras telas: 1-2h
3. 📊 Recolher feedback dos amigos
4. 🔄 Fazer ajustes baseado em feedback

---

## 💬 Perguntas?

Se der algum erro, vá para:
- Railway Docs: https://railway.app/docs
- Logs do Railway: Railway Dashboard → Logs
- Arquivo DEPLOY_RAILWAY.md (mais detalhado)

**Boa sorte! 🚀**
