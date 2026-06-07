FROM node:20-alpine

WORKDIR /app

# Install system dependencies for Prisma and nginx
RUN apk add --no-cache openssl nginx

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

# Copy nginx config
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

    # Backend Fastify
    upstream bot {
        server 127.0.0.1:3001;
    }

    # Frontend Next.js
    upstream dashboard {
        server 127.0.0.1:3000;
    }

    server {
        listen 80;
        server_name _;

        # Serve Next.js on root
        location / {
            proxy_pass http://dashboard;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # API routes go to Fastify
        location /api/ {
            proxy_pass http://bot;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Webhook routes go to Fastify
        location /webhook {
            proxy_pass http://bot;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            proxy_pass http://bot;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
        }
    }
}
EOF

# Expose port
EXPOSE 80

# Create startup script
RUN cat > /app/entrypoint.sh << 'SCRIPT'
#!/bin/sh
set -e

# Start Fastify backend on port 3001
cd /app/apps/bot
PORT=3001 node dist/index.js &
BOT_PID=$!

# Start Next.js dashboard on port 3000
cd /app/apps/dashboard
PORT=3000 npm run start &
DASHBOARD_PID=$!

# Start nginx on port 80
nginx -g "daemon off;"

# Wait for processes
wait $BOT_PID $DASHBOARD_PID
SCRIPT

RUN chmod +x /app/entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Start
CMD ["/app/entrypoint.sh"]
