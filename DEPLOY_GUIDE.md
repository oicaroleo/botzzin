# Guia de Deploy — BotZZIN

## 🚀 Opção 1: Railway (Recomendado para Fase 1)

Railway é a forma mais rápida para colocar em produção. Tempo: ~10 minutos.

### Setup

1. Crie uma conta em [railway.app](https://railway.app)
2. Conecte seu GitHub (ou faça upload manual)
3. Crie um novo projeto
4. Selecione "Deploy from GitHub"
5. Autorize acesso ao seu repositório `BOTZZIN`

### Configurar Variáveis de Ambiente

No dashboard Railway:
```
TELEGRAM_BOT_TOKEN = seu_token
WEBHOOK_URL = https://seu-subdominio.railway.app
NODE_ENV = production
PORT = 3000
```

### Deploy Automático

- Railway fará build automático com `pnpm build`
- Iniciará com `pnpm start`
- Cada push para `main` fará redeploy automático

### Obter URL Pública

Depois do deploy, Railway fornecerá uma URL como:
```
https://seu-subdominio.railway.app
```

Use isto como `WEBHOOK_URL` em produção.

---

## 🚀 Opção 2: Render.com

Alternativa popular com free tier.

### Setup

1. Acesse [render.com](https://render.com)
2. Crie um novo "Web Service"
3. Conecte seu repositório GitHub
4. Configure:
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Node Version**: 20

### Variáveis de Ambiente

```
TELEGRAM_BOT_TOKEN = seu_token
WEBHOOK_URL = https://seu-servico.onrender.com
NODE_ENV = production
```

---

## 🚀 Opção 3: Docker + VPS (Selvagem/Manual)

Para máximo controle. Precisa de um VPS (DigitalOcean, AWS, Linode, etc).

### Pré-requisitos

```bash
# No seu VPS
apt-get update
apt-get install docker.io docker-compose-v2 git

# Clonar repo
git clone https://github.com/seu-user/BOTZZIN.git
cd BOTZZIN
```

### Build & Deploy

```bash
# Copiar .env e editar
cp .env.example .env
nano .env  # Adicionar TELEGRAM_BOT_TOKEN e WEBHOOK_URL

# Build Docker
docker build -t botzzin:latest .

# Rodar container
docker run -d \
  --name botzzin \
  --restart always \
  --env-file .env \
  -p 3000:3000 \
  botzzin:latest

# Verificar se está rodando
docker logs -f botzzin
```

### Nginx Reverse Proxy (Recomendado)

Para HTTPS automático com Let's Encrypt:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Instale certbot para HTTPS:
```bash
apt-get install certbot python3-certbot-nginx
certbot --nginx -d seu-dominio.com
```

---

## 🚀 Opção 4: Vercel (Se Adicionar Frontend Next.js)

Vercel é perfeito para **Fase 3** quando tiver o dashboard.

Por enquanto, use Railway ou Render.

---

## 📝 Checklist Pré-Deploy

- [ ] Token do BotFather obtido
- [ ] Domínio apontando para seu servidor (DNS A record)
- [ ] HTTPS funcionando (obrigatório para webhook)
- [ ] `.env` configurado com variáveis corretas
- [ ] Teste local passou (`pnpm dev`)
- [ ] Logs não mostram erros

---

## 🔧 Troubleshooting de Deploy

### "Webhook not accessible"
- Certifique-se que HTTPS está ativo
- Teste: `curl https://seu-dominio.com/health`
- Verifique firewall (porta 443 aberta)

### "Bot não responde"
- Execute `/admin/setup-webhook` manualmente
- Verifique logs: `docker logs -f botzzin`
- Confirme `WEBHOOK_URL` está correta

### "502 Bad Gateway"
- App pode estar em boot. Espere 30s
- Verifique memória: `docker stats`
- Verifique logs para crash

---

## 📊 Monitoramento

### Logs
```bash
# Railway
railway logs

# Docker
docker logs -f botzzin

# Render
# Via dashboard
```

### Health Check
```bash
curl https://seu-dominio.com/health
```

Esperado:
```json
{"status":"ok"}
```

---

## 🔄 Atualizações

### Railway/Render
- Simples: `git push` e redeploy automático

### Docker Manual
```bash
cd BOTZZIN
git pull
docker build -t botzzin:latest .
docker stop botzzin
docker run -d --name botzzin --restart always --env-file .env -p 3000:3000 botzzin:latest
```

---

## 💰 Custos

| Plataforma | Free Tier | Pago |
|---|---|---|
| **Railway** | R$ 5/mês crédito | +R$ 0.0006/hora |
| **Render** | Unlimited (com reboot) | ~R$ 100/mês |
| **Docker VPS** | Não | R$ 50-150/mês |
| **Vercel** | Sim | Conforme uso |

Railway é recomendado para começar!

---

## 🚀 Deploy Agora (Railway)

1. [Crie conta Railway](https://railway.app)
2. Conecte seu GitHub
3. Crie projeto → Deploy from Repo
4. Adicione variáveis de ambiente
5. Pronto! 🎉

---

## Próximo: Fase 2

Quando estiver pronto para:
- PostgreSQL
- Integração PushinPay
- Dashboard Next.js

Atualize este guia com:
- `DATABASE_URL` 
- Migrations Prisma
- Vercel para frontend
