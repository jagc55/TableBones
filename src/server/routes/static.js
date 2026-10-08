import fs from 'node:fs';
import path from 'node:path';
import { DIST_DIR } from '../config.js';
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};
export const serveFrontend = (req, res, pathname) => {
  // Strip subpath /tablebones if present
  if (pathname.startsWith('/tablebones/')) {
    pathname = pathname.slice('/tablebones'.length);
  } else if (pathname === '/tablebones') {
    res.writeHead(301, { Location: '/tablebones/' });
    res.end();
    return;
  }

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  let filePath = path.join(DIST_DIR, pathname);

  // Security check against directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || stats.isDirectory()) {
      // SPA Fallback to index.html
      const fallbackPath = path.join(DIST_DIR, 'index.html');
      fs.readFile(fallbackPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found. Make sure to build the project first (npm run build).');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Static assets can be cached
    if (pathname.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
};
