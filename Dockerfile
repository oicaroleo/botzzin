FROM node:20-alpine

WORKDIR /app

# Install system dependencies for Prisma
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copy bot app
COPY apps/bot ./apps/bot

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build
RUN pnpm build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Create start script with better error handling
RUN cat > /app/start.sh << 'EOF'
#!/bin/sh
set -e

echo "=== Starting BotZZIN ==="
echo "Current directory: $(pwd)"
echo "Files in /app/apps/bot/prisma/:"
ls -la /app/apps/bot/prisma/ || echo "ERROR: prisma directory not found!"

echo ""
echo "=== Running Prisma migrations ==="
cd /app/apps/bot
npx prisma migrate deploy --skip-generate || {
  echo "ERROR: Migration failed!"
  exit 1
}

echo ""
echo "=== Starting server ==="
cd /app
pnpm --filter @botzzin/bot start

EOF
chmod +x /app/start.sh

# Start
CMD ["/app/start.sh"]
