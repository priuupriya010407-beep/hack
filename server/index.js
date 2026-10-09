import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDatabase, getDashboardStats, listInvestigations, listReports, getInvestigation, createInvestigation, undoInvestigation, saveResultFeedback, getResultFeedback, createReport, addAuditLog, getUserByEmail, createUser, verifyPassword, closeDb } from './db.js';
import { analyzeSocialPost } from './logic.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, 'utf8') < 32) {
  throw new Error('JWT_SECRET must be set to a cryptographically random value of at least 32 bytes.');
}

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required.' });
  }
  return next();
};

app.use(cors({ origin: process.env.CORS_ORIGIN || false }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_, res) => {
  try {
    checkDatabase();
  } catch (error) {
    console.error('Database health check failed:', error);
    return res.status(503).json({ status: 'unavailable', app: process.env.APP_NAME || 'ProofPixel AI' });
  }

  return res.json({
    status: 'ok',
    app: process.env.APP_NAME || 'ProofPixel AI',
    modelStatus: process.env.AI_MODEL_STATUS || 'not-configured',
    ocrService: process.env.OCR_SERVICE || 'local-tesseract',
  });
});

app.get('/api/config', (_, res) => {
  res.json({
    aiConfigured: (process.env.AI_MODEL_STATUS || 'not-configured') === 'configured',
    modelName: process.env.AI_MODEL_NAME || 'not-configured',
    ocrService: process.env.OCR_SERVICE || 'local-tesseract',
    urlThreatProvider: process.env.URL_THREAT_PROVIDER || 'structural-checks-only',
    disclaimer: 'ProofPixel AI assists with digital authenticity investigation. Automated analysis provides indicators, not definitive proof. Confirm important claims through trusted original sources.',
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    const user = createUser({ email, password, displayName: name, role: 'user' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ token, user: { ...user, name: user.display_name } });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const valid = verifyPassword(password, user.salt, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token, user: { id: user.id, email: user.email, name: user.display_name, role: user.role } });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = getUserByEmail(req.user.email);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  return res.json({ id: user.id, email: user.email, name: user.display_name, role: user.role });
});

app.get('/api/dashboard', requireAuth, (req, res) => {
  const dashboard = getDashboardStats(req.user.id);
  res.json(dashboard);
});

app.get('/api/investigations', requireAuth, (req, res) => {
  const investigations = listInvestigations(req.user.id).map((item) => ({
    id: item.id,
    title: item.title,
    scanType: item.scan_type,
    status: item.status,
    resultStatus: item.result_status,
    createdAt: item.created_at,
    completedAt: item.completed_at,
    notes: item.notes,
    hasReport: Boolean(item.has_report),
  }));
  res.json(investigations);
});

app.post('/api/investigations', requireAuth, (req, res) => {
  const { title, scanType, status, resultStatus, notes } = req.body || {};
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Investigation title is required.' });
  }

  const allowedTypes = ['image', 'video', 'certificate', 'url', 'message', 'social', 'comparison'];
  if (!allowedTypes.includes(scanType) || typeof resultStatus !== 'string' || resultStatus.length > 200) {
    return res.status(400).json({ error: 'A supported scan type and result status are required.' });
  }
  const created = createInvestigation({
    userId: req.user.id,
    title: title.slice(0, 200),
    scanType,
    status: 'completed',
    resultStatus,
    notes: typeof notes === 'string' ? notes.slice(0, 500) : '',
  });
  addAuditLog({ userId: req.user.id, action: 'create_investigation', resourceType: 'investigation', resourceId: created.id });

  return res.status(201).json({
    id: created.id,
    title: created.title,
    scanType: created.scan_type,
    status: created.status,
    resultStatus: created.result_status,
    createdAt: created.created_at,
  });
});

app.delete('/api/investigations/:id/undo', requireAuth, (req, res) => {
  const investigation = getInvestigation(req.params.id, req.user.id);
  if (!investigation) {
    return res.status(404).json({ error: 'Investigation not found.' });
  }

  const latestUndoableInvestigation = listInvestigations(req.user.id).find((item) => !item.has_report);
  if (latestUndoableInvestigation?.id !== investigation.id) {
    return res.status(409).json({ error: 'Only your most recent investigation without a saved report can be undone.' });
  }

  if (!undoInvestigation(investigation.id, req.user.id)) {
    return res.status(409).json({ error: 'This investigation has a saved report and cannot be undone. Delete or retain the report first.' });
  }

  addAuditLog({ userId: req.user.id, action: 'undo_investigation', resourceType: 'investigation', resourceId: investigation.id });
  return res.json({ undoneId: investigation.id });
});

app.get('/api/investigations/:id/feedback', requireAuth, (req, res) => {
  const investigation = getInvestigation(req.params.id, req.user.id);
  if (!investigation) {
    return res.status(404).json({ error: 'Investigation not found.' });
  }
  const feedback = getResultFeedback({ userId: req.user.id, investigationId: investigation.id });
  return res.json({ feedback });
});

app.post('/api/investigations/:id/feedback', requireAuth, (req, res) => {
  const investigation = getInvestigation(req.params.id, req.user.id);
  if (!investigation) {
    return res.status(404).json({ error: 'Investigation not found.' });
  }
  if (typeof req.body?.helpful !== 'boolean') {
    return res.status(400).json({ error: 'Feedback must indicate whether the result was helpful.' });
  }

  const feedback = saveResultFeedback({
    userId: req.user.id,
    investigationId: investigation.id,
    helpful: req.body.helpful,
  });
  addAuditLog({ userId: req.user.id, action: 'submit_result_feedback', resourceType: 'investigation', resourceId: investigation.id });
  return res.status(201).json({ ...feedback, saved: true });
});

app.get('/api/reports', requireAuth, (req, res) => {
  const reports = listReports(req.user.id).map((item) => ({
    id: item.id,
    title: item.report_type,
    type: item.report_type,
    status: 'Ready',
    generatedAt: item.created_at,
    data: item.report_data ? JSON.parse(item.report_data) : null,
  }));
  res.json(reports);
});

app.post('/api/reports', requireAuth, (req, res) => {
  const { investigationId, reportType, data, storagePath } = req.body || {};
  if (!investigationId || !reportType) {
    return res.status(400).json({ error: 'Investigation ID and report type are required.' });
  }
  if (!getInvestigation(investigationId, req.user.id)) {
    return res.status(404).json({ error: 'Investigation not found.' });
  }

  const report = createReport({
    investigationId,
    userId: req.user.id,
    reportType,
    data: data || { summary: 'Generated from stored findings' },
    storagePath: storagePath || 'demo/report.json',
  });

  addAuditLog({ userId: req.user.id, action: 'generate_report', resourceType: 'report', resourceId: report.id });
  return res.status(201).json(report);
});

app.post('/api/hash', requireAuth, (req, res) => {
  const { value } = req.body || {};
  if (!value || typeof value !== 'string') {
    return res.status(400).json({ error: 'Value is required.' });
  }
  return res.json({ hash: createHash('sha256').update(value).digest('hex') });
});

app.post('/api/analyze/url', requireAuth, (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string' || url.length > 2048) {
    return res.status(400).json({ error: 'URL is required.' });
  }

  try {
    const parsed = new URL(url.trim());
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Only http and https links can be checked.' });
    }
    const hostname = parsed.hostname;
    const hasHttps = parsed.protocol === 'https:';
    const suspicious = /[0-9]{1,3}(\.[0-9]{1,3}){3}/.test(hostname)
      || hostname.includes('xn--')
      || hostname.includes('paypal-security')
      || hostname.includes('verify')
      || hostname.includes('secure-paypal')
      || hostname.includes('login');

    res.json({
      hostname,
      https: hasHttps,
      structuralChecksOnly: true,
      suspicious,
      warnings: suspicious ? ['Possible lookalike domain pattern'] : ['No obvious structural signal detected'],
      provider: process.env.URL_THREAT_PROVIDER || 'structural-checks-only',
      note: 'ProofPixel AI assists with digital authenticity investigation. Automated analysis provides indicators, not definitive proof.',
    });
  } catch {
    res.status(400).json({ error: 'Invalid URL format.' });
  }
});

app.post('/api/analyze/message', requireAuth, (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || text.length > 10000) {
    return res.status(400).json({ error: 'Message text is required and must be 10,000 characters or fewer.' });
  }

  const warnings = [];
  const lower = text.toLowerCase();
  if (lower.includes('urgent') || lower.includes('immediately')) warnings.push('Urgency pressure detected');
  if (lower.includes('otp') || lower.includes('password')) warnings.push('Credentials requested');
  if (lower.includes('payment') || lower.includes('wire')) warnings.push('Payment instruction identified');
  if (lower.includes('suspended') || lower.includes('blocked')) warnings.push('Threat-based language present');
  if (lower.includes('claim') || lower.includes('winner')) warnings.push('Prize or reward claim detected');

  res.json({
    status: warnings.length ? 'warning' : 'no-warning-signals',
    warnings,
    summary: warnings.length ? 'Basic rule-based checks found suspicious patterns.' : 'No obvious rule-based red flags detected.',
    mode: 'rule-based-checks',
  });
});

app.post('/api/analyze/social', requireAuth, (req, res) => {
  const { text = '', url = '', source = '' } = req.body || {};
  if (typeof source !== 'string' || source.length > 40) {
    return res.status(400).json({ error: 'Source must be a short platform label.' });
  }

  try {
    return res.json({ ...analyzeSocialPost({ text, url }), source: source.trim() || 'manual' });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Social post analysis failed.' });
  }
});

app.post('/api/analyze/image', requireAuth, (req, res) => {
  const { filename } = req.body || {};
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Filename is required.' });
  }

  res.json({
    status: 'AI detector not configured',
    model: 'not-configured',
    score: null,
    findings: [],
    evidence: 'No image model processed this file. Browser-side file integrity and metadata checks are available.',
    limitations: 'This endpoint does not inspect image pixels or detect manipulation.',
  });
});

app.get('/api/admin/metrics', requireAuth, requireAdmin, (req, res) => {
  const stats = getDashboardStats(req.user.id);
  res.json({
    totalInvestigations: stats.total,
    reportsGenerated: stats.reportsGenerated,
    pendingJobs: listInvestigations(req.user.id).filter((item) => item.status === 'queued').length,
    failedScans: listInvestigations(req.user.id).filter((item) => item.status === 'failed').length,
    modelAvailable: process.env.AI_MODEL_STATUS === 'configured',
  });
});

const publicDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

const server = app.listen(port, () => {
  console.log(`ProofPixel AI backend running on http://localhost:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close(() => {
      closeDb();
      process.exit(0);
    });
  });
}
