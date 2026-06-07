# 🧪 Guia Completo de Teste — BotZZIN MVP

## 🚀 Fluxo Completo de Teste

### **Passo 1: Teste no Telegram**

```
1. Abra Telegram
2. Procure seu bot (busque o username)
3. Envie: /start
```

**Resposta esperada:**
```
👋 Bem-vindo ao BotZZIN!

Aqui você pode:
✅ Gerar PIX para pagamento
✅ Acessar conteúdo exclusivo
✅ Receber suporte 24/7

Clique no botão abaixo para começar!

[💳 Gerar PIX] [📱 Suporte]
```

---

### **Passo 2: Gerar PIX Real**

```
1. Clique em: 💳 Gerar PIX
```

**Resposta esperada:**
```
💳 PIX Gerado com Sucesso!

Valor: R$ 19.90
Expira em: 60 minutos

QR Code: [código aqui]
Copiar e Colar: [chave pix]

[✅ Já Paguei] [❌ Cancelar]
```

⚠️ **NOTA:** O PIX é REAL! Você vai ver no dashboard do PushinPay.

---

### **Passo 3: Simular Pagamento (Para Teste)**

**Em vez de pagar de verdade, use este endpoint:**

#### **Opção A: Via cURL (Recomendado)**

```bash
# 1. Primeiro, COPIE o ID do pagamento que aparece nos logs
# Procure no terminal por: "[PUSHPAY] PIX criado com sucesso: a1f67f45-a5c9-44bf-985c-7c5957ef3484"

# 2. Depois rode este comando (substituindo o ID):
curl -X POST "http://localhost:3000/webhooks/simulate?paymentId=cmq36qt9l0003pn51mjxw5j6u"

# Resposta esperada:
# {
#   "ok": true,
#   "message": "Pagamento simulado com sucesso!",
#   "paymentId": "cmq36qt9l0003pn51mjxw5j6u"
# }
```

#### **Opção B: Via Telegram**

Depois você pode criar um botão no bot que simule pagamento (para testes futuros).

---

### **Passo 4: Receber Link de Acesso**

Após simular o pagamento, você receberá uma mensagem privada:

```
✅ Acesso Liberado!

Bem-vindo ao Canal Exclusivo BotZZIN! 🎉

Seu link de acesso:
https://t.me/c/3966757980/1?invite=...

Válido por: 30 dias
Expira em: 07/07/2026

Clique no link para entrar agora!
```

---

### **Passo 5: Entrar no Canal**

```
1. Clique no link recebido
2. Você será adicionado ao canal privado
3. Pronto! Acesso liberado ✅
```

---

## 🔍 Entender os Logs

No terminal, você verá:

```
[PUSHPAY] Criando PIX: { amount: 19.9, description: '...' }
[PUSHPAY] PIX criado com sucesso: a1f67f45-a5c9-44bf-985c-7c5957ef3484
[CHANNEL] Gerando link de convite para 30 dias
[CHANNEL] Link criado: https://t.me/c/...
[CHANNEL] Link enviado para user: 7585829179
```

---

## 💡 Dicas de Teste

**1. Testar com múltiplos users:**
- Use contas de amigos
- Cada um faz `/start` → gera PIX → recebe link

**2. Ver no Dashboard PushinPay:**
- Acesse: https://app.pushinpay.com.br (se tiver acesso)
- Veja os PIXs reais sendo criados

**3. Enviar link para amigos:**
- Eles clicam no link
- Entram no canal privado

---

## ⚙️ Variáveis Configuráveis (Para Depois)

Agora estão hardcoded:
- Canal ID: `-3966757980`
- Dias válidos: `30`
- Valor do plano: `19.90`
- Mensagem de boas-vindas: padrão

**Depois, no site, você configurará:**
- Múltiplos canais
- Múltiplos planos
- Mensagens customizadas
- Outros fluxos (order bump, upsell, etc)

---

## 🆘 Problemas Comuns

**"Não consigo encontrar meu bot no Telegram"**
- Verifique o username (case-sensitive)
- Procure digitando @username_completo

**"Link de convite expirou"**
- Links têm 30 dias de validade
- Depois precisa gerar novo pagamento

**"Bot não responde"**
- Verifique se servidor está rodando (`pnpm dev`)
- Confira WEBHOOK_URL no .env

---

## ✅ Checklist de Teste

- [ ] Bot responde `/start`
- [ ] Gera PIX real
- [ ] PIX aparece no PushinPay
- [ ] Simula pagamento com curl
- [ ] Recebe link de convite
- [ ] Consegue entrar no canal
- [ ] Testar com amigo também

---

**Pronto para testar!** 🚀
