import { defineConfig, loadEnv } from 'vite';
import chatHandler from './api/chat.js';
import modelsHandler from './api/models.js';

/**
 * Plugin dev: mô phỏng serverless proxy /api/chat & /api/models của Vercel khi chạy `vite dev`.
 * Không có middleware này, môi trường dev không có route /api/* → mọi lượt gọi AI qua proxy đều fail
 * và app rơi xuống "AI Parser nội bộ" dù key trong .env đúng.
 * Handler dùng chung code với api/chat.js & api/models.js (chạy trên Vercel ở production),
 * key đọc từ process.env phía server — không bao giờ nhúng vào bundle client.
 */
function vercelApiDevPlugin(env) {
  const readBody = (req) => new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });

  // Handler viết theo style Vercel (res.status().json()) — bọc helper cho res thuần của Node
  const wrapRes = (res) => {
    if (!res.status) {
      res.status = (code) => { res.statusCode = code; return res; };
      res.json = (obj) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(obj));
        return res;
      };
    }
    return res;
  };

  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0];
        if (url !== '/api/chat' && url !== '/api/models') return next();

        // Nạp biến từ .env vào process.env cho handler (bao gồm cả biến không có tiền tố VITE_)
        for (const [key, value] of Object.entries(env)) {
          if (process.env[key] === undefined) process.env[key] = value;
        }

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }
        req.body = await readBody(req);
        const handler = url === '/api/chat' ? chatHandler : modelsHandler;
        try {
          await handler(req, wrapRes(res));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err?.message || 'Internal Server Error' }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  // loadEnv với prefix rỗng → nạp TẤT CẢ biến trong .env (kể cả biến server-side không có VITE_)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      port: 3000,
      open: true
    },
    plugins: [vercelApiDevPlugin(env)],
    build: {
      target: 'esnext'
    }
  };
});
