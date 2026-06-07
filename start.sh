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
echo "=== Starting server ==="
cd /app
pnpm --filter @botzzin/bot start
