// Playwright helper: fulfil browser-side /api/v1/* requests from the fictional demo data.
//   import { installDemoRoutes } from './scripts/ui-demo/route.mjs';
//   const log = await installDemoRoutes(page, 'admin'); // 'admin' | 'partner' | 'anon'
// Returns { unhandled: string[], errors: string[] } that fills up as the page runs.
import { handle } from './data.mjs';

export async function installDemoRoutes(page, persona = 'anon', { verbose = false } = {}) {
  const log = { unhandled: [], errors: [] };
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const index = url.pathname.indexOf('/api/v1/');
    const path = url.pathname.slice(index + '/api/v1'.length);
    const method = request.method();

    // Server-sent events for the partner portal: keep quiet, slow reconnect.
    if (path === '/partners/events') {
      return route.fulfill({ status: persona === 'partner' ? 200 : 401, headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' }, body: 'retry: 600000\n: demo stream\n\n' });
    }
    if (path === '/auth/csrf') {
      await page.context().addCookies([{ name: 'dvb_csrf', value: 'demo-csrf-token', url: url.origin }]).catch(() => {});
    }

    let body;
    const raw = request.postData();
    if (raw) { try { body = JSON.parse(raw); } catch { body = undefined; } }
    let result;
    try {
      result = handle({ method, path, query: url.searchParams, persona, body });
    } catch (error) {
      log.errors.push(`${method} ${path}: ${error instanceof Error ? error.message : error}`);
      console.error(`[demo-route] handler error ${method} ${path}`, error);
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Demo handler error' }) });
    }
    if (!result) {
      log.unhandled.push(`${method} ${path}${url.search}`);
      console.warn(`[demo-route] unhandled ${method} ${path}${url.search}`);
      return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not found' }) });
    }
    if (verbose) console.log(`[demo-route] ${result.status} ${method} ${path}${url.search}`);
    return route.fulfill({
      status: result.status,
      contentType: 'application/json; charset=utf-8',
      headers: { 'cache-control': 'no-store', 'x-demo-data': 'fictional' },
      body: result.body === undefined || result.body === null ? '' : JSON.stringify(result.body),
    });
  });
  return log;
}
