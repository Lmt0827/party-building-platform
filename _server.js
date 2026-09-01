const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
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
};

const ANNOTATION_CSS = '<link rel="stylesheet" href="/annotation.css" />';
const ANNOTATION_JS = '<script src="/annotation.js"></script>';

function injectAnnotations(html) {
  let result = html;
  // 注入 CSS 到 </head> 前
  if (result.includes('</head>')) {
    result = result.replace(/<\/head>/i, ANNOTATION_CSS + '\n</head>');
  }
  // 注入 JS 到 </body> 前
  if (result.includes('</body>')) {
    result = result.replace(/<\/body>/i, ANNOTATION_JS + '\n</body>');
  }
  return result;
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (urlPath === '/') {
    urlPath = '/index.html';
  }

  // If no extension and doesn't end with /, try adding .html
  if (!path.extname(urlPath) && !urlPath.endsWith('/')) {
    urlPath += '.html';
  }

  const filePath = path.join(ROOT, urlPath);

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found: ' + urlPath);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    // 对 HTML 响应自动注入批注组件
    if (ext === '.html') {
      const html = data.toString('utf-8');
      const injected = injectAnnotations(html);
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(Buffer.from(injected, 'utf-8'));
      return;
    }

    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://127.0.0.1:${PORT}/`);
});
