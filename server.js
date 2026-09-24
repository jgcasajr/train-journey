import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.env.PORT) || 5173;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function resolvePath(url) {
  try {
    const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
    const filePath = resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname));
    return filePath.startsWith(ROOT + sep) ? filePath : null;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const filePath = resolvePath(req.url);
  if (!filePath) {
    res.writeHead(400).end('Bad request');
    return;
  }
  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch (err) {
    const notFound = err.code === 'ENOENT' || err.code === 'EISDIR';
    if (!notFound) console.error(err);
    res.writeHead(notFound ? 404 : 500).end(notFound ? 'Not found' : 'Server error');
  }
});

server.listen(PORT, () => console.log(`Train Journey rodando em http://localhost:${PORT}`));
