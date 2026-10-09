import 'dotenv/config';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databasePath = process.env.SQLITE_DB_PATH || path.join(__dirname, 'proofpixel.db');
mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });
const db = new Database(databasePath);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('secure_delete = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS investigations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'demo-user',
    title TEXT NOT NULL,
    scan_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    result_status TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS uploaded_files (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    detected_mime_type TEXT,
    file_size INTEGER,
    storage_path TEXT,
    sha256_hash TEXT,
    retention_status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS analysis_results (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    check_type TEXT NOT NULL,
    tool_name TEXT,
    tool_version TEXT,
    result_status TEXT,
    score REAL,
    findings TEXT,
    limitations TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    report_type TEXT NOT NULL,
    report_data TEXT,
    storage_path TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS file_comparisons (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_a_hash TEXT,
    file_b_hash TEXT,
    comparison_status TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS result_feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    investigation_id TEXT NOT NULL,
    helpful INTEGER NOT NULL CHECK (helpful IN (0, 1)),
    created_at TEXT NOT NULL,
    UNIQUE (user_id, investigation_id)
  );
`);

const ensureSeedData = () => {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get()?.count ?? 0;
  if (userCount === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.pbkdf2Sync('demo123', salt, 100000, 64, 'sha512').toString('hex');
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, display_name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('demo-user', 'demo@proofpixel.ai', passwordHash, salt, 'Alex Morgan', 'admin', new Date().toISOString(), new Date().toISOString());
  }

  const profileCount = db.prepare('SELECT COUNT(*) AS count FROM profiles').get()?.count ?? 0;
  if (profileCount === 0) {
    db.prepare(`
      INSERT INTO profiles (id, display_name, avatar_url, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('demo-user', 'Alex Morgan', '', 'admin', new Date().toISOString(), new Date().toISOString());
  }

  const investigationCount = db.prepare('SELECT COUNT(*) AS count FROM investigations').get()?.count ?? 0;
  if (investigationCount === 0) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO investigations (id, user_id, title, scan_type, status, result_status, created_at, completed_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('INV-1001', 'demo-user', 'Sample image inspection', 'image', 'completed', 'Potential Manipulation Indicators', now, now, 'DEMO DATA');

    db.prepare(`
      INSERT INTO investigations (id, user_id, title, scan_type, status, result_status, created_at, completed_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('INV-1002', 'demo-user', 'Certificate OCR review', 'certificate', 'completed', 'No Indicators Detected by Available Checks', now, now, 'DEMO DATA');

    db.prepare(`
      INSERT INTO reports (id, investigation_id, user_id, report_type, report_data, storage_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('RPT-2001', 'INV-1001', 'demo-user', 'image', JSON.stringify({ title: 'Sample evidence report', status: 'ready' }), 'demo/report-2001.json', now);
  }
};

if (process.env.NODE_ENV !== 'production') {
  ensureSeedData();
}

export function getDb() {
  return db;
}

export function checkDatabase() {
  db.prepare('SELECT 1').get();
  return true;
}

export function closeDb() {
  if (db.open) db.close();
}

export function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
}

export function createUser({ email, password, displayName, role = 'user' }) {
  const existing = getUserByEmail(email);
  if (existing) {
    throw new Error('User already exists.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  const id = `user-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, display_name, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, email.toLowerCase(), passwordHash, salt, displayName, role, now, now);

  const userRecord = db.prepare('SELECT id, email, display_name, role, created_at FROM users WHERE id = ?').get(id);
  return userRecord;
}

export function verifyPassword(password, salt, passwordHash) {
  const candidate = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(passwordHash, 'hex'));
}

export function listInvestigations(userId = 'demo-user') {
  return db.prepare(`
    SELECT investigations.*,
      EXISTS (
        SELECT 1 FROM reports
        WHERE reports.investigation_id = investigations.id
          AND reports.user_id = investigations.user_id
      ) AS has_report
    FROM investigations
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);
}

export function listReports(userId = 'demo-user') {
  return db.prepare('SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

export function createInvestigation({ userId = 'demo-user', title, scanType, status = 'queued', resultStatus = 'Inconclusive', notes = '' }) {
  const id = `INV-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO investigations (id, user_id, title, scan_type, status, result_status, created_at, completed_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, title, scanType, status, resultStatus, now, status === 'completed' ? now : null, notes);
  return db.prepare('SELECT * FROM investigations WHERE id = ?').get(id);
}

export function getDashboardStats(userId = 'demo-user') {
  const investigations = listInvestigations(userId);
  const reports = listReports(userId);

  const dashboard = {
    total: investigations.length,
    imageScans: investigations.filter((item) => item.scan_type === 'image').length,
    videoScans: investigations.filter((item) => item.scan_type === 'video').length,
    certificateReviews: investigations.filter((item) => item.scan_type === 'certificate').length,
    reportsGenerated: reports.length,
    activity: investigations.slice(0, 5),
    summary: {
      modelAvailable: false,
      status: 'DEMO DATA',
    },
  };

  return dashboard;
}

export function addAuditLog({ userId = 'demo-user', action, resourceType, resourceId }) {
  const id = `LOG-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, action, resourceType, resourceId, new Date().toISOString());
}

export function getInvestigation(investigationId, userId = 'demo-user') {
  return db.prepare('SELECT * FROM investigations WHERE id = ? AND user_id = ?').get(investigationId, userId);
}

export function undoInvestigation(investigationId, userId) {
  const deleteInvestigation = db.transaction(() => {
    const hasReport = db.prepare(`
      SELECT 1 FROM reports WHERE investigation_id = ? AND user_id = ?
    `).get(investigationId, userId);
    if (hasReport) return false;

    db.prepare('DELETE FROM result_feedback WHERE investigation_id = ? AND user_id = ?').run(investigationId, userId);
    const result = db.prepare(`
      DELETE FROM investigations
      WHERE id = ? AND user_id = ?
    `).run(investigationId, userId);
    return result.changes > 0;
  });

  return deleteInvestigation();
}

export function saveResultFeedback({ userId, investigationId, helpful }) {
  const id = `FDB-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO result_feedback (id, user_id, investigation_id, helpful, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (user_id, investigation_id)
    DO UPDATE SET helpful = excluded.helpful, created_at = excluded.created_at
  `).run(id, userId, investigationId, helpful ? 1 : 0, createdAt);
  return { investigationId, helpful, createdAt };
}

export function getResultFeedback({ userId, investigationId }) {
  const feedback = db.prepare(`
    SELECT helpful, created_at AS createdAt
    FROM result_feedback
    WHERE user_id = ? AND investigation_id = ?
  `).get(userId, investigationId);
  return feedback ? { helpful: Boolean(feedback.helpful), createdAt: feedback.createdAt } : null;
}

export function createReport({ investigationId, userId = 'demo-user', reportType, data, storagePath }) {
  const id = `RPT-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO reports (id, investigation_id, user_id, report_type, report_data, storage_path, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, investigationId, userId, reportType, JSON.stringify(data), storagePath, new Date().toISOString());
  return db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
}
