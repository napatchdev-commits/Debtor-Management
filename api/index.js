import express from 'express';
import cors from 'cors';
import { initDb, setGoogleSheetsUrl, hydrateFromGoogleSheets } from '../server/db.js';
import apiRoutes from '../server/routes/api.js';

const app = express();

app.use(cors());
app.use(express.json());

// Auto-detect and configure Google Sheets URL from client header in real-time
app.use((req, res, next) => {
  const gsUrlHeader = req.headers['x-google-sheets-url'];
  if (gsUrlHeader && typeof gsUrlHeader === 'string' && gsUrlHeader.trim().startsWith('http')) {
    setGoogleSheetsUrl(gsUrlHeader.trim());
  }
  next();
});

// Serverless instances start with empty/seed memory: reload real data from Google Sheets first
app.use(async (req, res, next) => {
  if (req.path.includes('/auth/') || req.path.endsWith('/health')) return next();
  try {
    await hydrateFromGoogleSheets({ maxAgeMs: req.method === 'GET' ? 5000 : 0 });
  } catch (e) {
    console.warn('hydrate error:', e.message);
  }
  next();
});

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
