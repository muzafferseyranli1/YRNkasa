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

  CREATE TABLE IF NOT EXISTS courier_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    courier_name TEXT NOT NULL,
    order_count INTEGER DEFAULT 0,
    unit_price REAL DEFAULT 20,
    total_amount REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_courier_date ON courier_payments(date);
  CREATE INDEX IF NOT EXISTS idx_courier_name ON courier_payments(courier_name);

  CREATE TABLE IF NOT EXISTS tip_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    card_tip_amount REAL DEFAULT 0,
    commission_rate REAL DEFAULT 20,
    deduction_amount REAL DEFAULT 0,
    net_cash_amount REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_tip_date ON tip_payments(date);
  CREATE INDEX IF NOT EXISTS idx_tip_staff ON tip_payments(staff_name);
`);

console.log(`[DB] SQLite database initialized at ${dbPath}`);

export default db;
