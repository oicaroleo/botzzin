#!/bin/bash

set -e

echo "🚀 BotZZIN Setup"
echo "==============="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale primeiro: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js: $NODE_VERSION"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm não encontrado. Instalando..."
    npm install -g pnpm
fi

PNPM_VERSION=$(pnpm -v)
echo "✅ pnpm: $PNPM_VERSION"
echo ""

# Copy .env.example to .env
if [ ! -f ".env" ]; then
    echo "📝 Criando arquivo .env..."
    cp .env.example .env
    echo "✅ Arquivo .env criado. Edite com seus valores!"
else
    echo "✅ Arquivo .env já existe."
fi

echo ""
echo "📦 Instalando dependências..."
pnpm install

echo ""
echo "✅ Setup concluído!"
echo ""
echo "📖 Próximos passos:"
echo "1. Edite .env com seus valores (TELEGRAM_BOT_TOKEN, WEBHOOK_URL)"
echo "2. Execute: pnpm dev"
echo "3. Leia FIRST_STEPS.md para instruções detalhadas"
echo ""
