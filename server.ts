import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const distPath = path.join(__dirname, 'dist');
const isProd = process.env.NODE_ENV === 'production' || process.env.VITE_PROD === 'true' || fs.existsSync(path.join(distPath, 'index.html'));

// Serve static assets in production, use Vite middleware in development
if (isProd) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      port: 3000,
      host: '0.0.0.0'
    },
    appType: 'custom',
  });
  app.use(vite.middlewares);
  app.get('*', async (req, res, next) => {
    try {
      res.sendFile(path.join(__dirname, 'index.html'));
    } catch (e) {
      next(e);
    }
  });
}

app.listen(port, () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
