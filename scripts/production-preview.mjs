import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const root = resolve('dist');
const port = Number(process.argv.at(-1)) || 4174;
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const sendFile = (response, file) => {
  response.writeHead(200, { 'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(response);
};

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = resolve(root, pathname.slice(1));
  const isSafeFile = file.startsWith(`${root}${sep}`) && existsSync(file) && statSync(file).isFile();

  if (isSafeFile) return sendFile(response, file);
  if (pathname.includes('.')) return response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  return sendFile(response, resolve(root, 'index.html'));
});

server.listen(port, '127.0.0.1', () => console.log(`Production preview listening on http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
