#!/bin/sh
set -e

echo "=== Starting BotZZIN ==="
echo "DATABASE_URL: $DATABASE_URL"

echo ""
echo "=== Syncing database schema with Prisma ==="
cd /app/apps/bot
npx prisma db push --skip-generate --accept-data-loss || {
  echo "ERROR: Database sync failed!"
  exit 1
}

echo ""
echo "=== Starting Fastify backend on port 3001 ==="
cd /app/apps/bot
PORT=3001 node dist/index.js &
BOT_PID=$!
echo "Fastify started with PID $BOT_PID"

echo ""
echo "=== Starting Next.js dashboard on port 3000 ==="
cd /app/apps/dashboard
PORT=3000 npm run start &
DASHBOARD_PID=$!
echo "Next.js started with PID $DASHBOARD_PID"

echo ""
echo "=== Starting nginx on port 80 ==="
nginx -g "daemon off;"

wait $BOT_PID $DASHBOARD_PID
