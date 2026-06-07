# 🧪 Testes - Fase 1: Backend Foundation

## Comandos para testar as APIs recém-criadas

### 1️⃣ Signup - Criar novo usuário

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "senha123456",
    "name": "Usuário Teste"
  }'
```

**Resposta esperada (201 Created):**
```json
{
  "user": {
    "id": "cuid-aqui",
    "email": "usuario@example.com",
    "name": "Usuário Teste"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### 2️⃣ Login - Autenticar usuário

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "senha123456"
  }'
```

**Resposta esperada:**
```json
{
  "user": {
    "id": "cuid-aqui",
    "email": "usuario@example.com",
    "name": "Usuário Teste"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### 3️⃣ Get User - Obter dados do usuário autenticado

```bash
# Substitua TOKEN pelo token retornado no login/signup
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

**Resposta esperada:**
```json
{
  "id": "cuid-aqui",
  "email": "usuario@example.com",
  "name": "Usuário Teste",
  "role": "user",
  "isActive": true,
  "lastLoginAt": "2026-06-07T14:30:00Z",
  "createdAt": "2026-06-07T14:25:00Z",
  "updatedAt": "2026-06-07T14:30:00Z"
}
```

---

### 4️⃣ Criar Bot - Registrar novo bot Telegram

```bash
# Você precisa de um token Telegram real do BotFather
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "telegramBotToken": "SEU_BOT_TOKEN_AQUI",
    "name": "Meu Bot de Vendas"
  }'
```

**Resposta esperada (201 Created):**
```json
{
  "id": "cuid-do-bot",
  "userId": "cuid-do-usuario",
  "telegramBotId": "1234567890",
  "telegramUsername": "@meu_bot",
  "telegramBotToken": "123456789:AAAA***",
  "status": "active",
  "welcomeMessage": "Meu Bot de Vendas",
  "config": {
    "id": "config-id",
    "botId": "cuid-do-bot",
    "channelId": null,
    "isActive": true
  },
  "plans": [],
  "stats": {
    "leads": 0,
    "payments": 0
  },
  "createdAt": "2026-06-07T14:30:00Z",
  "updatedAt": "2026-06-07T14:30:00Z"
}
```

---

### 5️⃣ Listar Bots - Ver todos os bots do usuário

```bash
curl -X GET http://localhost:3000/api/bots \
  -H "Authorization: Bearer TOKEN"
```

**Resposta esperada:**
```json
{
  "bots": [
    {
      "id": "cuid-do-bot",
      "telegramBotId": "1234567890",
      "telegramUsername": "@meu_bot",
      "status": "active",
      ...
    }
  ],
  "total": 1
}
```

---

### 6️⃣ Obter Bot - Detalhes de um bot específico

```bash
curl -X GET http://localhost:3000/api/bots/BOT_ID \
  -H "Authorization: Bearer TOKEN"
```

---

### 7️⃣ Atualizar Bot - Editar configurações

```bash
curl -X PATCH http://localhost:3000/api/bots/BOT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "welcomeMessage": "Nova mensagem de boas-vindas!",
    "defaultChannelId": "-3966757980",
    "status": "active"
  }'
```

---

### 8️⃣ Webhook Status - Verificar status do webhook

```bash
curl -X GET http://localhost:3000/api/bots/BOT_ID/webhook-status \
  -H "Authorization: Bearer TOKEN"
```

---

### 9️⃣ Deletar Bot - Remover um bot

```bash
curl -X DELETE http://localhost:3000/api/bots/BOT_ID \
  -H "Authorization: Bearer TOKEN"
```

**Resposta esperada:**
```json
{
  "ok": true,
  "message": "Bot deletado com sucesso"
}
```

---

## ✅ Checklist de Testes

- [ ] Signup cria usuário com sucesso
- [ ] Email inválido é rejeitado no signup
- [ ] Senha curta é rejeitada no signup
- [ ] Email duplicado é rejeitado no signup
- [ ] Login com credenciais corretas funciona
- [ ] Login com senha incorreta falha (401)
- [ ] Get /auth/me retorna dados do usuário autenticado
- [ ] Token expirado/inválido é rejeitado (401)
- [ ] Criar bot valida token Telegram
- [ ] Bot é criado com sucesso
- [ ] Listar bots retorna apenas bots do usuário
- [ ] Atualizar bot funciona
- [ ] Deletar bot funciona
- [ ] Multi-tenant: usuário A não pode ver/editar bots de usuário B

---

## 🐛 Troubleshooting

**Erro 401 Unauthorized**
- Verifique se o token foi passado corretamente no header `Authorization: Bearer TOKEN`
- Token pode ter expirado (válido por 7 dias)

**Erro 400 Bad Request**
- Email inválido
- Senha muito curta (mínimo 6 caracteres)
- Token Telegram inválido ou não fornecido

**Erro 404 Not Found**
- Bot não existe
- Verifique se está passando o ID correto

---

## 📝 Notas

- Tokens expiram em 7 dias (JWT_EXPIRY)
- Senhas são hasheadas com bcrypt (salt round 10)
- Tokens Telegram são validados contra API oficial do Telegram
- Multi-tenancy: cada usuário vê apenas seus próprios bots
- Token completo do bot não é retornado nas respostas (segurança)
