import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fragmentShader } from './fractal.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// Маркер в public/main.js, куда инжектится скомпилированный шейдер.
// Контракт между сервером-компилятором и клиентом. Заменяется вместе с
// заглушкой '' после маркера, иначе получится два литерала подряд.
const SHADER_MARKER = "/*__SHADER__*/ ''";

// Сервер работает как мини-компилятор: при старте собирает bundle main.js,
// подставляя GLSL-строку (полученную из DSL через eval) на место маркера.
// Дальше bundle кешируется в памяти и отдаётся как статика.
async function buildBundle() {
  const mainJs = await readFile(join(PUBLIC_DIR, 'main.js'), 'utf8');
  const bundle = mainJs.replace(
    SHADER_MARKER,
    () => JSON.stringify(fragmentShader),
  );
  if (bundle === mainJs) {
    throw new Error(
      `main.js не содержит маркер инъекции шейдера "${SHADER_MARKER}"`,
    );
  }
  return Buffer.from(bundle, 'utf8');
}

export async function createApp() {
  const mainBundle = await buildBundle();
  return createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }

    const { pathname } = new URL(req.url, 'http://localhost');
    const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const filePath = normalize(join(PUBLIC_DIR, decodeURIComponent(relative)));

    if (!filePath.startsWith(PUBLIC_DIR) && filePath + sep !== PUBLIC_DIR) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    // Скомпилированный bundle отдаём вместо исходного main.js.
    if (filePath === join(PUBLIC_DIR, 'main.js')) {
      res.writeHead(200, {
        'Content-Type': MIME_TYPES['.js'],
        'Content-Length': mainBundle.length,
      });
      res.end(req.method === 'HEAD' ? undefined : mainBundle);
      return;
    }

    try {
      const body = await readFile(filePath);
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
        'Content-Length': body.length,
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3434;
  const server = (await createApp()).listen(port, () => {
    console.log(`Fractal at http://localhost:${port}`);
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
}
