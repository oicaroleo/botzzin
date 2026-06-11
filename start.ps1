# BotZZIN — Iniciar todos os serviços
# Execute com: powershell -ExecutionPolicy Bypass -File start.ps1

Write-Host "`n=== BotZZIN START ===" -ForegroundColor Green

$NGROK_DOMAIN = "constrain-liquefy-reformer.ngrok-free.dev"

# 1. Mata processos antigos (Node + ngrok)
Write-Host "`n[1/6] Encerrando processos anteriores..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null | Out-Null
taskkill /F /IM ngrok.exe 2>$null | Out-Null
Start-Sleep -Seconds 2

# 2. Verifica Docker (Postgres + Redis)
Write-Host "[2/6] Verificando Docker..." -ForegroundColor Yellow
$pg = Get-NetTCPConnection -LocalPort 5433 -ErrorAction SilentlyContinue
$redis = Get-NetTCPConnection -LocalPort 6379 -ErrorAction SilentlyContinue
if (-not $pg)    { Write-Host "  AVISO: Postgres nao encontrado na porta 5433" -ForegroundColor Red }
else             { Write-Host "  Postgres OK (5433)" -ForegroundColor Green }
if (-not $redis) { Write-Host "  AVISO: Redis nao encontrado na porta 6379" -ForegroundColor Red }
else             { Write-Host "  Redis OK (6379)" -ForegroundColor Green }

New-Item -ItemType Directory -Force -Path "C:\temp" | Out-Null

# 3. Sobe Bot API (porta 3002)
Write-Host "`n[3/6] Iniciando Bot API (porta 3002)..." -ForegroundColor Yellow
$api = Start-Process -FilePath "node" `
    -ArgumentList "dist/index.js" `
    -WorkingDirectory "C:\BOTZZIN\apps\bot" `
    -RedirectStandardOutput "C:\temp\api.log" `
    -RedirectStandardError "C:\temp\api-err.log" `
    -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 3
$apiPort = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($apiPort) { Write-Host "  Bot API OK — PID $($api.Id)" -ForegroundColor Green }
else          { Write-Host "  Bot API FALHOU — veja C:\temp\api-err.log" -ForegroundColor Red }

# 4. Sobe ngrok (tunel publico -> porta 3002, necessario p/ webhooks do Telegram)
Write-Host "`n[4/6] Iniciando ngrok ($NGROK_DOMAIN -> 3002)..." -ForegroundColor Yellow
$ngrok = Start-Process -FilePath "C:\BOTZZIN\ngrok.exe" `
    -ArgumentList "http", "--url=https://$NGROK_DOMAIN", "3002" `
    -PassThru -WindowStyle Minimized
Start-Sleep -Seconds 5
try {
    $tunnels = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
    $url = ($tunnels.tunnels | Select-Object -First 1).public_url
    Write-Host "  ngrok OK — $url -> http://localhost:3002 (PID $($ngrok.Id))" -ForegroundColor Green
} catch {
    Write-Host "  ngrok FALHOU — verifique se o dominio esta disponivel / token ngrok" -ForegroundColor Red
}

# 5. Sobe Worker Manager
Write-Host "`n[5/6] Iniciando Worker Manager..." -ForegroundColor Yellow
$env:BOT_MODE = "manager"
$manager = Start-Process -FilePath "node" `
    -ArgumentList "dist/index.js" `
    -WorkingDirectory "C:\BOTZZIN\apps\bot" `
    -RedirectStandardOutput "C:\temp\manager.log" `
    -RedirectStandardError "C:\temp\manager-err.log" `
    -PassThru -WindowStyle Hidden
$env:BOT_MODE = ""
Start-Sleep -Seconds 2
Write-Host "  Worker Manager OK — PID $($manager.Id)" -ForegroundColor Green

# 6. Sobe Dashboard (porta 3001)
Write-Host "`n[6/6] Iniciando Dashboard (porta 3001)..." -ForegroundColor Yellow
$dash = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c pnpm dev --port 3001 > C:\temp\dashboard.log 2>&1" `
    -WorkingDirectory "C:\BOTZZIN\apps\dashboard" `
    -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 10
$dashPort = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($dashPort) { Write-Host "  Dashboard OK — PID $($dash.Id)" -ForegroundColor Green }
else           { Write-Host "  Dashboard FALHOU — veja C:\temp\dashboard.log" -ForegroundColor Red }

Write-Host "`n=== PRONTO ===" -ForegroundColor Green
Write-Host "  Dashboard:    http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Bot API:      http://localhost:3002" -ForegroundColor Cyan
Write-Host "  ngrok:        https://$NGROK_DOMAIN" -ForegroundColor Cyan
Write-Host "  ngrok painel: http://localhost:4040" -ForegroundColor Cyan
Write-Host "  Logs:         C:\temp\*.log" -ForegroundColor Cyan
Write-Host ""
