import express from 'express';
import cors from 'cors';
import { initDb } from '../server/db.js';
import apiRoutes from '../server/routes/api.js';

const app = express();

app.use(cors());
app.use(express.json());

// Support both /api/... and /... routes on Vercel Serverless
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: 'vercel-serverless', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: 'vercel-serverless', timestamp: new Date().toISOString() });
});

// Global Serverless Error Handler
app.use((err, req, res, next) => {
  console.error('Vercel Serverless Error:', err);
  res.status(500).json({
    message: err.message || 'เกิดข้อผิดพลาดในการประมวลผลของเซิร์ฟเวอร์'
  });
});

// Init DB once in serverless context
initDb().catch((err) => {
  console.error('Failed to init DB on Vercel:', err);
});

export default app;
