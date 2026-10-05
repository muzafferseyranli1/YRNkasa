import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import reportsRouter from './routes/reports.js';
import uploadRouter from './routes/upload.js';
import { requireAuth, loginHandler, checkHandler, authEnabled } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static directory for uploaded receipt images
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.set('trust proxy', 1);

// Auth (health ve giriş hariç tüm API ve yüklenen görseller korumalı)
app.post('/api/auth/login', loginHandler);
app.get('/api/auth/check', checkHandler);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/uploads', requireAuth, express.static(uploadsDir));

// API routes
app.use('/api/reports', requireAuth, reportsRouter);
app.use('/api/upload', requireAuth, uploadRouter);

// Serve frontend in production
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] YRN Kasa server running on http://0.0.0.0:${PORT}`);
  if (!authEnabled()) {
    console.warn('[SERVER] UYARI: AUTH_PASSWORD tanımlı değil, kimlik doğrulama KAPALI. Üretimde bu ortam değişkenini ayarlayın.');
  }
});
