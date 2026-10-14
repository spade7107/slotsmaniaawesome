const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const STARTING_BALANCE = 1000;
const DATA_FILE = path.join(__dirname, 'data', 'balance.json');
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

let balance = STARTING_BALANCE;

function loadBalance() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (typeof data.balance === 'number' && Number.isFinite(data.balance)) {
        balance = Math.max(0, Math.floor(data.balance));
        return;
      }
    }
  } catch {
    // use default
  }
  balance = STARTING_BALANCE;
  saveBalance();
}

function saveBalance() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify({ balance }, null, 2), 'utf8');
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function safeFilePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const relative = decoded === '/' ? '/index.html' : decoded;
  const resolved = path.normalize(path.join(ROOT, relative));
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

function serveStatic(req, res) {
  const filePath = safeFilePath(new URL(req.url, `http://${req.headers.host}`).pathname);
  if (!filePath) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

async function handleApi(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/balance') {
    sendJson(res, 200, { balance });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/balance/adjust') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { error: 'Invalid request body' });
      return;
    }
    const delta = Number(body.delta);
    if (!Number.isFinite(delta)) {
      sendJson(res, 400, { error: 'Invalid delta' });
      return;
    }
    const next = balance + delta;
    if (next < 0) {
      sendJson(res, 400, { error: 'Insufficient funds', balance });
      return;
    }
    balance = Math.floor(next);
    saveBalance();
    sendJson(res, 200, { balance });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/balance/reset') {
    balance = STARTING_BALANCE;
    saveBalance();
    sendJson(res, 200, { balance });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}

loadBalance();

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, pathname);
    } catch {
      sendJson(res, 500, { error: 'Server error' });
    }
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Shared balance: $${balance} — open /games.html, /blackjack.html, or /mvp.html`);
});
