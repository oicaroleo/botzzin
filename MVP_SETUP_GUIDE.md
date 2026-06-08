# 🚀 BOTZZIN MVP - Guia de Setup Completo

## Status Atual
✅ **Backend**: Funcionando em produção  
✅ **Dashboard**: Funcionando em produção  
⚠️ **Webhook Telegram**: Precisa de setup manual  

---

## 🔧 Setup Obrigatório - Ativar Webhook

Para o bot responder no Telegram, você precisa registrar o webhook:

### Opção 1: Via curl (Recomendado)

```bash
curl -X POST https://botzzin-production.up.railway.app/admin/setup-webhook
```

**Resposta esperada:**
```json
{
  "success": true,
  "webhookUrl": "https://botzzin-production.up.railway.app/webhook",
  "message": "Webhook registrado com sucesso!"
}
```

### Opção 2: Via Postman

1. Método: **POST**
2. URL: `https://botzzin-production.up.railway.app/admin/setup-webhook`
3. Headers: `Content-Type: application/json`
4. Clique **Send**

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

**Status**: MVP pronto para produção com setup de webhook manual (será automatizado em breve)
