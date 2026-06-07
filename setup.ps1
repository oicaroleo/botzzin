#!/usr/bin/env pwsh

Write-Host "🚀 BotZZIN Setup" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado. Instale primeiro: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check pnpm
try {
    $pnpmVersion = pnpm -v
    Write-Host "✅ pnpm: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  pnpm não encontrado. Instalando..." -ForegroundColor Yellow
    npm install -g pnpm
    $pnpmVersion = pnpm -v
    Write-Host "✅ pnpm instalado: $pnpmVersion" -ForegroundColor Green
}

Write-Host ""

# Copy .env.example to .env
if (-not (Test-Path ".env")) {
    Write-Host "📝 Criando arquivo .env..." -ForegroundColor Cyan
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Arquivo .env criado. Edite com seus valores!" -ForegroundColor Green
} else {
    Write-Host "✅ Arquivo .env já existe." -ForegroundColor Green
}

Write-Host ""
Write-Host "📦 Instalando dependências..." -ForegroundColor Cyan
pnpm install

Write-Host ""
Write-Host "✅ Setup concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "📖 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Edite .env com seus valores (TELEGRAM_BOT_TOKEN, WEBHOOK_URL)"
Write-Host "2. Execute: pnpm dev"
Write-Host "3. Leia FIRST_STEPS.md para instruções detalhadas"
Write-Host ""
