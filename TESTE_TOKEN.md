# ✅ Como Testar se o Token Telegram é Válido

## 🔍 Teste Rápido

Execute este comando no terminal (Cole no ChatGPT ou use curl):

```bash
curl -s "https://api.telegram.org/bot<SEUS_TOKEN>/getMe"
```

**Substituir `<SEU_TOKEN>` pelo seu token real**

## ✅ Resposta VÁLIDA (sucesso):
```json
{
  "ok": true,
  "result": {
    "id": 1234567890,
    "is_bot": true,
    "first_name": "MyBot",
    "username": "mybot123_bot",
    "can_join_groups": true,
    "can_read_all_group_messages": false,
    "supports_inline_queries": false,
    "can_connect_to_business": false
  }
}
```

## ❌ Resposta INVÁLIDA:
```json
{
  "ok": false,
  "error_code": 401,
  "description": "Unauthorized"
}
```

---

## 🤖 Obter Token VÁLIDO

### Passo 1: Abrir Telegram
1. Abra o Telegram
2. Busque por **@BotFather**
3. Clique em **"Start"**

### Passo 2: Criar Novo Bot
1. Digite: `/newbot`
2. Siga as instruções
3. Escolha um nome (ex: `MyBot`)
4. Escolha um username **ÚNICO** com `_bot` no final (ex: `mybot123_bot`)

### Passo 3: Copiar Token
BotFather vai responder:
```
Use this token to access the HTTP API:
1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi
```

**⚠️ COPIE O TOKEN COMPLETO COM OS DOIS PONTOS**

### Passo 4: Colar no BotZZIN
1. Volte a: https://botzzin-production.up.railway.app
2. Clique em **"+ Novo Bot"**
3. Cole o token COMPLETO
4. Clique em **"Criar bot"**

---

## 🛠️ Troubleshooting

### Erro: "Erro ao validar token Telegram"
- Token está **inválido**
- Volte ao @BotFather
- Gere um **novo** token
- Copie **TUDO** (com os dois pontos)

### Erro: "Este bot Telegram já está cadastrado"
- Você já cadastrou este bot
- Use um bot **DIFERENTE**
- Ou crie um novo em @BotFather

### Nada acontece ao clicar "Criar bot"
- Verifique a internet
- Recarregue a página (F5)
- Verifique console (F12) para erros

---

## ✨ Pronto!
Seu bot deve aparecer na lista e você pode:
- **Configurar** - Mensagem de boas-vindas
- **Planos** - Criar planos de preço
- **Métricas** - Ver analytics

