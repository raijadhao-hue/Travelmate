import express from 'express';
import { createServer as createViteServer } from 'vite';
import { initializeDb } from './server/db.js';
import authRoutes from './server/routes/auth.js';
import apiRoutes from './server/routes/api.js';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(express.json());

  // Initialize Database
  initializeDb();

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api', apiRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
