FROM node:20-alpine

WORKDIR /app

# Install system dependencies for Prisma and nginx
RUN apk add --no-cache openssl nginx curl

# Install pnpm
RUN npm install -g pnpm

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copy both apps
COPY apps/bot ./apps/bot
COPY apps/dashboard ./apps/dashboard

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build both apps
RUN pnpm build

# Setup nginx config
RUN cat > /etc/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    gzip on;

    upstream bot_backend {
        server 127.0.0.1:3001;
    }

    upstream dashboard_frontend {
        server 127.0.0.1:3000;
    }

    server {
        listen 8080;
        server_name _;

        # Proxy API calls to Fastify
        location /api/ {
            proxy_pass http://bot_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Proxy webhook calls to Fastify
        location /webhook {
            proxy_pass http://bot_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Proxy admin calls to Fastify
        location /admin/ {
            proxy_pass http://bot_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check from Fastify
        location /health {
            proxy_pass http://bot_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
        }

        # Everything else goes to Next.js dashboard
        location / {
            proxy_pass http://dashboard_frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
EOF

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

echo ""
echo "=== Syncing database schema with Prisma ==="
cd /app/apps/bot
npx prisma db push --skip-generate --accept-data-loss || {
  echo "WARNING: Database sync failed, continuing anyway..."
}

echo ""
echo "=== Starting Fastify backend on port 3001 ==="
cd /app/apps/bot
PORT=3001 node dist/index.js > /tmp/bot.log 2>&1 &
BOT_PID=$!
echo "Bot started with PID $BOT_PID"

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
while [ $RETRY -lt $MAX_RETRIES ]; do
  if curl -s http://127.0.0.1:3000 > /dev/null 2>&1; then
    echo "✓ Dashboard is ready!"
    break
  fi
  RETRY=$((RETRY + 1))
  echo "  Attempt $RETRY/$MAX_RETRIES..."
  sleep 2
done

echo ""
echo "=== Verifying backend is still responding ==="
if ! curl -f -s http://127.0.0.1:3001/health > /dev/null 2>&1; then
  echo "⚠ WARNING: Backend stopped responding!"
fi

echo ""
echo "=== Starting nginx reverse proxy on port 8080 ==="
mkdir -p /var/log/nginx
nginx -g "daemon off;" &
NGINX_PID=$!
echo "Nginx started with PID $NGINX_PID"

echo ""
echo "✓ All services started!"
echo ""
echo "Service endpoints:"
echo "  Backend API: http://127.0.0.1:3001"
echo "  Dashboard: http://127.0.0.1:3000"
echo "  Public (nginx): http://127.0.0.1:8080"
echo ""
echo "Live logs:"
echo "  tail -f /tmp/bot.log"
echo "  tail -f /tmp/dashboard.log"
echo "  tail -f /var/log/nginx/error.log"
echo ""
echo "=== All systems operational ==="

# Wait for all background jobs to keep the container alive
wait
SCRIPT

RUN chmod +x /app/entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start
CMD ["/app/entrypoint.sh"]
