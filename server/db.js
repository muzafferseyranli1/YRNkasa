import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory for persistence (mountable in Docker / Coolify)
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'kasa.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and reliability
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_reports (
    date TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    devir REAL DEFAULT 0,
    fiziki_kasa REAL DEFAULT 0,
    toplam_satis REAL DEFAULT 0,
    hesaplanan_nakit REAL DEFAULT 0,
    kasa_farki REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_reports_date ON daily_reports(date);
`);

console.log(`[DB] SQLite database initialized at ${dbPath}`);

export default db;
