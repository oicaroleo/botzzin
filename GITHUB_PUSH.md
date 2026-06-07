# 🚀 Fazer Push para GitHub

## ✅ Passo 1: Copie a URL do seu repositório

1. Acesse https://github.com/new
2. Crie repositório com nome `botzzin`
3. **NÃO** inicialize com README
4. Clique "Create repository"
5. **Copie a URL** que aparece (formato: `https://github.com/SEU_USUARIO/botzzin.git`)

---

## ✅ Passo 2: Execute no terminal

Substitua `SEU_USUARIO` pela sua URL:

```bash
git remote add origin https://github.com/SEU_USUARIO/botzzin.git
git branch -M main
git push -u origin main
```

**Exemplo:**
```bash
git remote add origin https://github.com/icaro/botzzin.git
git branch -M main
git push -u origin main
```

---

## ✅ Passo 3: Autenticar

Git pode pedir autenticação. Use um dos métodos:

### Opção A: Personal Access Token (Recomendado)

1. No GitHub, vá para Settings → Developer settings → Personal access tokens
2. Clique "Generate new token"
3. Selecione scopes: `repo`, `workflow`
4. Copie o token
5. Quando Git pedir senha, cole o token (não a senha do GitHub)

### Opção B: SSH

1. Se tiver SSH configurado, Railway vai aceitar automaticamente

### Opção C: GitHub CLI

```bash
gh auth login
# Siga as instruções
```

---

## ✅ Passo 4: Verificar Push

Acesse https://github.com/SEU_USUARIO/botzzin

Você deve ver todos os arquivos lá! ✅

---

## 📝 Depois que push funciona, volte aqui para continuar com Railway

Próximo passo: **Conectar Railway ao repositório GitHub**
