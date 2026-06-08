# 🚀 BOTZZIN MVP - Guia de Setup Completo

## Status Atual
✅ **Backend**: Funcionando em produção  
✅ **Dashboard**: Funcionando em produção  
⚠️ **Webhook Telegram**: Precisa de setup manual  

---

## 🔧 Setup Obrigatório - Ativar Webhook

Para o bot responder no Telegram, você precisa registrar o webhook:

### Opção 1: Via Dashboard (Recomendado) ⭐ NOVO

1. Acesse https://botzzin-production.up.railway.app
2. Faça login com sua conta
3. Clique no bot que deseja ativar
4. Na aba **⚙️ Configuração**, clique no botão **🚀 Ativar Webhook**
5. Aguarde a confirmação de sucesso

### Opção 2: Via curl

```bash
# Substitua SEU_BOT_TOKEN pelo token do seu bot
curl -X POST "https://botzzin-production.up.railway.app/api/webhooks/setup?token=SEU_BOT_TOKEN"
```

**Resposta esperada:**
```json
{
  "success": true,
  "webhookUrl": "https://botzzin-production.up.railway.app/webhook",
  "message": "Webhook registrado com sucesso!"
}
```

**Exemplo com token real:**
```bash
curl -X POST "https://botzzin-production.up.railway.app/api/webhooks/setup?token=8985129811:AAG1ty9bTfzlmUSpNX_mQdl5hDu7s_j1LvU"
```

### Opção 3: Via Postman

1. Método: **POST**
2. URL: `https://botzzin-production.up.railway.app/api/webhooks/setup?token=SEU_BOT_TOKEN`
3. Headers: `Content-Type: application/json`
4. Body: deixe vazio (apenas {})
5. Clique **Send**

---

## ✅ Depois de Ativar o Webhook

Seu bot responderá normalmente:

1. Abra o Telegram
2. Procure seu bot (ex: @bot_89262977)
3. Digite `/start`
4. Bot responde com a mensagem de boas-vindas!

---

## 🐛 Problemas Conhecidos do MVP

### Problema 1: Aba "Planos" dá erro
**Status**: Minor bug no frontend  
**Workaround**: Recarregue a página (F5)  
**Fix**: Em progresso

### Problema 2: Bot não responde no Telegram
**Status**: Webhook não configurado  
**Solução**: Execute o comando acima (**Opção 1**)  
**Verificação**: 
```bash
# Testar se webhook está funcionando
curl -X POST https://botzzin-production.up.railway.app/webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"text":"teste"}}'
```

---

## 📋 Checklist de Setup Completo

- [ ] Criar conta no BotZZIN
- [ ] Criar bot (token qualquer com formato: `número:string`)
- [ ] Configurar mensagem de boas-vindas
- [ ] **Ativar webhook** (curl command acima)
- [ ] Testar bot no Telegram (/start)
- [ ] Criar planos de preço
- [ ] Visualizar métricas

---

## 🎯 Após Setup Completo

Seu bot estará **100% funcional**:
- ✅ Responde ao /start
- ✅ Envia mensagem customizada
- ✅ Rastreia leads
- ✅ Sistema de planos
- ✅ Analytics completo

---

## 💡 Dicas

1. **Token do Bot**: Você pode usar qualquer string no formato `número:string` no MVP
2. **Webhook**: Precisa ser ativado UMA VEZ por bot
3. **Mensagens**: Configure em "Configuração" → "Mensagem de Boas-vindas"

---

## 🆘 Suporte

Se o webhook retornar erro:
1. Verifique se Railway está online
2. Verifique se o token do bot está salvo corretamente
3. Recarregue a página e tente novamente

---

---

## 🎯 Arquitetura Técnica

### Multi-Tenant SaaS
- **Cada cliente** tem seu próprio bot com token único
- **Cada bot** tem configuração independente (mensagens, canais, planos)
- **Cada bot** é rastreado com métricas separadas

### Stack Técnico
- **Backend**: Fastify 4.28.0 + Telegram Bot API (grammY)
- **Frontend**: Next.js 16.2.7 com App Router
- **Database**: PostgreSQL com Prisma ORM
- **Proxy**: Node.js HTTP proxy para unified entry point
- **Deploy**: Railway com Docker multi-service

### Fluxo de Requisições
```
[Client] → Railway:8080 (proxy) 
  ├→ /api/*, /webhook, /admin/* → Fastify Backend (3001)
  └→ /* (outras) → Next.js Dashboard (3000)
```

**Status**: MVP pronto para produção ✅
