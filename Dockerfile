FROM node:20-alpine

WORKDIR /app

# Install system dependencies for Prisma
RUN apk add --no-cache openssl curl

# Install pnpm
RUN npm install -g pnpm

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copy all apps including new proxy
COPY apps/bot ./apps/bot
COPY apps/dashboard ./apps/dashboard
COPY apps/proxy ./apps/proxy

# Install dependencies
RUN pnpm install

# Build bot and dashboard apps (proxy doesn't need building)
RUN pnpm --filter @botzzin/bot build && pnpm --filter dashboard build

# Expose port
EXPOSE 8080

# Create startup script
RUN cat > /app/entrypoint.sh << 'SCRIPT'
#!/bin/sh

echo "=== Starting BotZZIN Multi-Service App ==="

# Trap to cleanup all child processes
cleanup() {
  echo "Shutting down all services..."
  kill $(jobs -p) 2>/dev/null || true
  wait
  exit 0
}
trap cleanup SIGTERM SIGINT

# Determine mode of operation first
BOT_MODE=${BOT_MODE:-server}

# Only sync database for server mode
if [ "$BOT_MODE" = "server" ]; then
  echo ""
  echo "=== Syncing database schema with Prisma ==="
  cd /app/apps/bot
  npx prisma db push --skip-generate --accept-data-loss || {
    echo "WARNING: Database sync failed, continuing anyway..."
  }
fi
echo ""
echo "=== Starting in mode: $BOT_MODE ==="

if [ "$BOT_MODE" = "server" ]; then
  echo ""
  echo "=== Starting Fastify webhook server on port 3001 ==="
  cd /app/apps/bot
  PORT=3001 node dist/index.js &
  BOT_PID=$!
  echo "Webhook server started with PID $BOT_PID"

  echo ""
  echo "=== Waiting for backend to be ready (max 30 seconds) ==="
  MAX_RETRIES=15
  RETRY=0
  while [ $RETRY -lt $MAX_RETRIES ]; do
    if curl -f -s http://127.0.0.1:3001/health > /dev/null 2>&1; then
      echo "✓ Backend is ready!"
      break
    fi
    RETRY=$((RETRY + 1))
    echo "  Attempt $RETRY/$MAX_RETRIES..."
    sleep 2
  done

  echo ""
  echo "=== Starting Next.js dashboard on port 3000 ==="
  cd /app/apps/dashboard
  PORT=3000 npm run start > /tmp/dashboard.log 2>&1 &
  DASHBOARD_PID=$!
  echo "Dashboard started with PID $DASHBOARD_PID"

  echo ""
  echo "=== Waiting for dashboard to be ready (max 30 seconds) ==="
  RETRY=0
  while [ $RETRY -lt 15 ]; do
    if curl -s http://127.0.0.1:3000 > /dev/null 2>&1; then
      echo "✓ Dashboard is ready!"
      break
    fi
    RETRY=$((RETRY + 1))
    echo "  Attempt $RETRY/15..."
    sleep 2
  done

  echo ""
  echo "=== Starting HTTP reverse proxy on port 8080 ==="
  cd /app/apps/proxy
  PORT=8080 npm run start > /tmp/proxy.log 2>&1 &
  PROXY_PID=$!
  echo "Proxy started with PID $PROXY_PID"

  echo ""
  echo "=== Waiting for proxy to be ready (max 10 seconds) ==="
  RETRY=0
  while [ $RETRY -lt 5 ]; do
    if curl -f -s http://127.0.0.1:8080/health > /dev/null 2>&1; then
      echo "✓ Proxy is ready!"
      break
    fi
    RETRY=$((RETRY + 1))
    echo "  Attempt $RETRY/5..."
    sleep 2
  done

  echo ""
  echo "✓ All services started!"
  echo "Service endpoints:"
  echo "  Backend API:  http://127.0.0.1:3001"
  echo "  Dashboard:    http://127.0.0.1:3000"
  echo "  Public proxy: http://127.0.0.1:8080"

elif [ "$BOT_MODE" = "worker" ]; then
  if [ -z "$BOT_ID" ]; then
    echo "ERROR: BOT_ID environment variable is required for worker mode"
    exit 1
  fi

  echo ""
  echo "=== Starting bot worker for BOT_ID: $BOT_ID ==="
  cd /app/apps/bot
  PORT=3001 node dist/index.js

elif [ "$BOT_MODE" = "manager" ]; then
  echo ""
  echo "=== Starting bot worker manager (auto-detect from database) ==="
  cd /app/apps/bot
  PORT=3001 node dist/index.js

else
  echo "ERROR: Unknown BOT_MODE: $BOT_MODE"
  echo "Valid modes: server, worker, manager"
  exit 1
fi

# Wait for all background jobs to keep the container alive
wait
SCRIPT

RUN chmod +x /app/entrypoint.sh

# Sem HEALTHCHECK no Dockerfile: a mesma imagem roda o serviço "server" (tudo-em-um,
# com proxy no :8080) e o serviço "worker"/manager (sem porta nenhuma). O healthcheck
# é configurado só no serviço server pelo painel do Railway (Healthcheck Path = /health).

# Start (modo definido pela env BOT_MODE: server | manager | worker)
CMD ["/app/entrypoint.sh"]
