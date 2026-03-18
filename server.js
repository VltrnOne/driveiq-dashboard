const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { execSync } = require('child_process');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Run DB migrations at startup (non-fatal if DB not ready yet)
if (process.env.DATABASE_URL) {
  try {
    console.log('[DriveIQ] Running prisma db push...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('[DriveIQ] Database schema up to date.');
  } catch (e) {
    console.warn('[DriveIQ] prisma db push failed (continuing):', e.message);
  }
} else {
  console.warn('[DriveIQ] DATABASE_URL not set — skipping migrations.');
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Shared WS client set — same reference used by wsManager.ts
global._driveiqClients = global._driveiqClients || new Set();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Request error', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname, query } = parse(request.url, true);
    if (pathname === '/api/ws/operators') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, query);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, _request, query) => {
    // Token auth: ?token=... or Authorization header
    // In prod, validate the token here
    console.log('[DriveIQ WS] Operator connected. Total:', global._driveiqClients.size + 1);
    global._driveiqClients.add(ws);

    ws.send(JSON.stringify({ type: 'connected', ts: Date.now() }));

    // Keepalive
    const ping = setInterval(() => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
      }
    }, 30000);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'pong') return; // client keepalive ack
      } catch { /* ignore */ }
    });

    ws.on('close', () => {
      clearInterval(ping);
      global._driveiqClients.delete(ws);
      console.log('[DriveIQ WS] Operator disconnected. Remaining:', global._driveiqClients.size);
    });

    ws.on('error', (err) => {
      console.error('[DriveIQ WS] Error:', err.message);
      global._driveiqClients.delete(ws);
    });
  });

  server.once('error', (err) => { console.error(err); process.exit(1); });

  server.listen(port, () => {
    console.log('\x1b[32m╔══════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[32m║         DRIVEIQ DASHBOARD READY          ║\x1b[0m');
    console.log('\x1b[32m╚══════════════════════════════════════════╝\x1b[0m');
    console.log(`\x1b[36m→ Dashboard:\x1b[0m  http://localhost:${port}/live`);
    console.log(`\x1b[36m→ Customers:\x1b[0m  http://localhost:${port}/customers`);
    console.log(`\x1b[36m→ WebSocket:\x1b[0m  ws://localhost:${port}/api/ws/operators`);
    console.log(`\x1b[33m→ Env:\x1b[0m        ${dev ? 'Development' : 'Production'}`);
  });
});
