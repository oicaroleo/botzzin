#!/bin/sh
set -e

echo "=== Starting BotZZIN ==="
echo "Current directory: $(pwd)"
echo "Files in prisma:"
ls -la apps/bot/prisma/ || echo "ERROR: prisma directory not found!"

echo ""
echo "=== Running Prisma migrations ==="
cd apps/bot
npx prisma migrate deploy --skip-generate || {
  echo "ERROR: Migration failed!"
  exit 1
}

echo ""
echo "=== Starting server ==="
cd ../..
pnpm --filter @botzzin/bot start
