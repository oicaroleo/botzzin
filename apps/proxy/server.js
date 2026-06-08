import http from 'http';
import httpProxy from 'http-proxy';

// Create proxy instances
const apiProxy = httpProxy.createProxyServer({
  target: 'http://127.0.0.1:3001',
  changeOrigin: true,
  logLevel: 'info',
});

const dashboardProxy = httpProxy.createProxyServer({
  target: 'http://127.0.0.1:3000',
  changeOrigin: true,
  logLevel: 'info',
});

// Create main server
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Route API and webhook requests to Fastify backend
  const isBackendRoute =
    req.url.startsWith('/api/') ||
    req.url === '/api' ||
    req.url.startsWith('/webhook') ||
    req.url === '/webhook' ||
    req.url.startsWith('/admin/') ||
    req.url === '/admin' ||
    req.url === '/health' ||
    req.url.startsWith('/health');

  if (isBackendRoute) {
    console.log('→ Routing to backend (3001) - URL:', req.url);
    apiProxy.web(req, res, (err) => {
      console.error('Backend proxy error:', err);
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend service unavailable' }));
    });
  } else {
    // Route everything else to Next.js dashboard
    console.log('→ Routing to dashboard (3000) - URL:', req.url);
    dashboardProxy.web(req, res, (err) => {
      console.error('Dashboard proxy error:', err);
      res.writeHead(503, { 'Content-Type': 'text/html' });
      res.end('<h1>Dashboard service unavailable</h1>');
    });
  }
});

// Handle WebSocket upgrades
server.on('upgrade', (req, socket, head) => {
  console.log(`[UPGRADE] ${req.url}`);
  dashboardProxy.ws(req, socket, head);
});

// Handle proxy errors
apiProxy.on('error', (err, req, res) => {
  console.error('[API PROXY ERROR]', err.message);
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Bad Gateway' }));
});

dashboardProxy.on('error', (err, req, res) => {
  console.error('[DASHBOARD PROXY ERROR]', err.message);
  res.writeHead(502, { 'Content-Type': 'text/html' });
  res.end('<h1>Bad Gateway</h1>');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✓ HTTP Proxy Server started on port ${PORT}`);
  console.log(`  - API/Webhook requests → http://127.0.0.1:3001`);
  console.log(`  - Dashboard requests  → http://127.0.0.1:3000\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
