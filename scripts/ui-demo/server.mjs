// Fictional demo API for UI screenshots only (no deps). Serves /api/v1/* with persona "anon"
// so Next.js server-side rendering gets public data. Nothing is persisted.
//   DEMO_API_PORT=4100 node scripts/ui-demo/server.mjs
import http from 'node:http';
import { handle } from './data.mjs';

const port = Number(process.env.DEMO_API_PORT || 4100);
const PREFIX = '/api/v1';

function send(res, status, body) {
  const text = body === undefined || body === null ? '' : JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-demo-data': 'fictional' });
  res.end(text);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/health' || url.pathname === `${PREFIX}/health`) return send(res, 200, { ok: true, demo: true });
  if (!url.pathname.startsWith(`${PREFIX}/`)) return send(res, 404, { message: 'Not found' });
  const path = url.pathname.slice(PREFIX.length);
  let raw = '';
  req.on('data', (chunk) => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); });
  req.on('end', () => {
    let body;
    try { body = raw ? JSON.parse(raw) : undefined; } catch { body = undefined; }
    let result;
    try {
      result = handle({ method: req.method ?? 'GET', path, query: url.searchParams, persona: 'anon', body });
    } catch (error) {
      console.error(`[demo-api] 500 ${req.method} ${url.pathname}`, error);
      return send(res, 500, { message: 'Demo API error' });
    }
    if (!result) {
      console.warn(`[demo-api] unhandled ${req.method} ${url.pathname}${url.search}`);
      return send(res, 404, { message: 'Not found' });
    }
    if (process.env.DEMO_API_LOG) console.log(`[demo-api] ${result.status} ${req.method} ${url.pathname}${url.search}`);
    send(res, result.status, result.body);
  });
});

server.listen(port, '127.0.0.1', () => console.log(`[demo-api] fictional demo API on http://127.0.0.1:${port}${PREFIX}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
