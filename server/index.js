import express from 'express';
import cors from 'cors';
import { initDb, setGoogleSheetsUrl } from './db.js';
import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3001;

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

// API Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Database then listen
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
