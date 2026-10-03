import http from 'node:http';

// Local, same-origin bridge for an isolated QA API + the production Next build.
// Fixed loopback ports prevent this helper from becoming a network proxy.
const upstreamFor = (path) => path.startsWith('/api/v1/') || path.startsWith('/media/') ? 33001 : 33002;
const server = http.createServer((request, response) => {
  const upstream = http.request({
    hostname: '127.0.0.1', port: upstreamFor(request.url ?? '/'),
    method: request.method, path: request.url, headers: request.headers,
  }, (proxied) => {
    response.writeHead(proxied.statusCode ?? 502, proxied.headers);
    proxied.pipe(response);
  });
  upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end(); });
  request.pipe(upstream);
});
server.listen(33000, '127.0.0.1', () => console.log('isolated partner UI QA proxy on 127.0.0.1:33000'));
