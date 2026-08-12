import express from 'express';
import cors from 'cors';
import { initDb } from '../server/db.js';
import apiRoutes from '../server/routes/api.js';

const app = express();

app.use(cors());
app.use(express.json());

// Support both /api/auth/login and /auth/login routes on Vercel Serverless
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: 'vercel-serverless', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: 'vercel-serverless', timestamp: new Date().toISOString() });
});

// Init DB once in serverless context
initDb().catch((err) => {
  console.error('Failed to init DB on Vercel:', err);
});

export default app;
