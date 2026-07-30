const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const db = require('./db');
const mongoConnection = require('./mongoConnection');
const applicationStore = require('./applicationStore');
const { authenticateToken } = require('./middleware/auth');

dotenv.config();

// SMTP Transporter configuration for real email sending
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

const app = express();

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { error: 'Too many attempts, try again in 15 minutes' },
});
app.use('/api/auth/login', loginLimiter);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin) || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

/* =========================
   AUTHENTICATION ENDPOINTS
========================= */

// Signup

// Login

// Logout

// Auth Me

/* =========================
   USER DIRECTORY ENDPOINTS
========================= */

// Get all users

// Toggle User Notification Permissions

/* =========================
   POSTS ENDPOINTS
========================= */


/* =========================
   EMAIL CAMPAIGN ENDPOINTS
========================= */

// Get emails history

// Send simulated emails (Direct or Bulk)

/* =========================
   CRM CALLING ENDPOINTS
========================= */

// Get call logs

// Initiate simulated call

/* =========================
   NOTIFICATION HUB ENDPOINTS
========================= */

// Get notification history

// Send simulated notification

// Resend notification

/* =========================
   MESSAGE CENTER / CHAT ENDPOINTS
========================= */

// Get all conversations list

// Get messages for a single conversation

// Flag conversation

// Send Chat Message (Admin or Mock User) with AI/Spam moderation

/* =========================
   COMPANY MODULE ENDPOINTS
========================= */

// Get all companies

// Get recruiters directory (synced with users in db.json)

// Get all jobs

// Get all reports/flags

// Get audit logs

// Get settings

// Save settings

// Verify company

// Suspend company (with cascades)

// Send email campaign to recruiters

// Toggle Job Featured Star

// Expire/Active job status

// Resolve Report ticket

/* =========================
   APPLICATION MODULE ENDPOINTS
========================= */

// Get all applications

// Update application status

// Delete application

// Default applicant responses sheet (publish to web as CSV for sync to work)
const DEFAULT_APPLICANT_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/19T3MgIa_iDzybzLneCqXYIbATxOuL644xqKtYuZUvbY/export?format=csv&gid=961207793';

function normalizeSheetCsvUrl(url) {
  if (!url) return DEFAULT_APPLICANT_SHEET_CSV_URL;
  const trimmed = url.trim();
  const sheetIdMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!sheetIdMatch) return trimmed;
  const gidMatch = trimmed.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv&gid=${gid}`;
}

function getMappedColumnIndices(headers) {
  const find = (...patterns) =>
    headers.findIndex((h) => patterns.some((p) => h.includes(p)));

  return {
    timestamp: find('timestamp'),
    email: find('email', 'e-mail', 'mail address'),
    name: headers.findIndex((h) => h.includes('name') && !h.includes('company') && !h.includes('user name')),
    phone: find('phone', 'contact number', 'mobile'),
    education: find('education', 'school', 'university', 'college'),
    skills: find('skill'),
    portfolio: find('portfolio', 'linkedin', 'website', 'github'),
    resume: find('resume', 'cv', 'upload'),
    coverLetter: find('cover', 'letter', 'purpose', 'statement', 'why'),
    position: find('position', 'job', 'role', 'interest', 'internship'),
  };
}

// CSV parser helper for Google Sheets
function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') { i++; }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  return lines;
}

// Sync applicants from Google Sheets CSV
async function syncApplicantsFromSheet(sheetUrl) {
  const csvUrl = normalizeSheetCsvUrl(sheetUrl);
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(
      'Failed to fetch the Google Sheet CSV. Open the sheet → File → Share → Publish to web → select this tab → Comma-separated values (.csv).'
    );
  }

  const csvText = await response.text();
  const rows = parseCSV(csvText);

  if (rows.length < 2) {
    throw new Error('The CSV has no data rows.');
  }

  const rawHeaders = rows[0].map((h) => h.trim());
  const headers = rawHeaders.map((h) => h.toLowerCase().trim());
  const cols = getMappedColumnIndices(headers);

  if (cols.email === -1 || cols.name === -1) {
    throw new Error('Could not find columns for Email or Name. Check your Sheet headers.');
  }

  const mappedIndices = new Set(
    Object.values(cols).filter((idx) => idx !== -1)
  );

  let addedCount = 0;
  const jobs = await db.getJobs();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[cols.email]) continue;

    const email = row[cols.email].trim();
    const name = row[cols.name].trim();
    const rawTimestamp = cols.timestamp !== -1 && row[cols.timestamp] ? row[cols.timestamp].trim() : '';

    let appliedDate = new Date().toISOString().split('T')[0];
    if (rawTimestamp) {
      const parsedDate = new Date(rawTimestamp);
      if (!isNaN(parsedDate.getTime())) {
        appliedDate = parsedDate.toISOString().split('T')[0];
      }
    }

    const phone = cols.phone !== -1 && row[cols.phone] ? row[cols.phone].trim() : '';
    const education = cols.education !== -1 && row[cols.education] ? row[cols.education].trim() : '';
    const skills = cols.skills !== -1 && row[cols.skills] ? row[cols.skills].trim() : '';
    const portfolioUrl = cols.portfolio !== -1 && row[cols.portfolio] ? row[cols.portfolio].trim() : '';
    const resumeUrl = cols.resume !== -1 && row[cols.resume] ? row[cols.resume].trim() : '';
    const coverLetter = cols.coverLetter !== -1 && row[cols.coverLetter] ? row[cols.coverLetter].trim() : '';
    const rawPosition = cols.position !== -1 && row[cols.position] ? row[cols.position].trim() : 'Applicant';

    const extraFields = {};
    for (let j = 0; j < rawHeaders.length; j++) {
      const value = row[j] ? row[j].trim() : '';
      if (!value || mappedIndices.has(j)) continue;
      extraFields[rawHeaders[j]] = value;
    }

    let jobId = 'j-sheet';
    let jobTitle = rawPosition;
    let companyName = 'OMAHCONNECT';

    const matchedJob = jobs.find(
      (j) =>
        j.title.toLowerCase().includes(rawPosition.toLowerCase()) ||
        rawPosition.toLowerCase().includes(j.title.toLowerCase())
    );
    if (matchedJob) {
      jobId = matchedJob.id;
      jobTitle = matchedJob.title;
      companyName = matchedJob.companyName;
    }

    const created = await applicationStore.createFromSheetRow({
      email,
      name,
      phone,
      education,
      skills,
      portfolioUrl,
      resumeUrl,
      coverLetter,
      jobId,
      jobTitle,
      companyName,
      appliedDate,
      extraFields,
    });

    if (created) addedCount++;
  }

  const settings = await db.getCompanySettings();
  settings.applicantSheetUrl = csvUrl;
  await db.saveCompanySettings(settings);

  return addedCount;
}



// Get database stats summary

const path = require('path');

// Serve static assets from the frontend build directory
app.use(express.static(path.join(__dirname, 'omahconnect-admin/dist')));

// Wildcard handler to serve frontend SPA for any other route
/* ---- API routes (extracted into src/routes/) ---- */
app.use('/api/auth', require('./src/routes/auth.routes')({ JWT_SECRET, authenticateToken, bcrypt, db, jwt }));
app.use('/api/users', require('./src/routes/users.routes')({ authenticateToken, db }));
app.use('/api/posts', require('./src/routes/posts.routes')({ db }));
app.use('/api/emails', require('./src/routes/emails.routes')({ applicationStore, authenticateToken, db, transporter }));
app.use('/api/calls', require('./src/routes/calls.routes')({ authenticateToken, db }));
app.use('/api/notifications', require('./src/routes/notifications.routes')({ authenticateToken, db }));
app.use('/api/messages', require('./src/routes/messages.routes')({ authenticateToken, db }));
app.use('/api/companies', require('./src/routes/companies.routes')({ authenticateToken, db }));
app.use('/api/applications', require('./src/routes/applications.routes')({ DEFAULT_APPLICANT_SHEET_CSV_URL, applicationStore, authenticateToken, db, normalizeSheetCsvUrl, syncApplicantsFromSheet }));
app.use('/api/dev', require('./src/routes/dev.routes')({ authenticateToken, db }));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'omahconnect-admin/dist', 'index.html'));
});

async function startServer() {
  await applicationStore.init(mongoConnection);

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📦 Applications storage: ${applicationStore.isUsingMongo() ? 'MongoDB' : 'JSON file (data/applications.json)'}`);

    // Sync applicants in the background so it doesn't block server startup
    const sheetUrl = process.env.APPLICANT_SHEET_CSV_URL || DEFAULT_APPLICANT_SHEET_CSV_URL;
    syncApplicantsFromSheet(sheetUrl)
      .then((added) => {
        console.log(`📋 Applicant sheet sync: imported ${added} new applicant(s)`);
      })
      .catch((error) => {
        console.warn('⚠️  Applicant sheet auto-sync skipped:', error.message);
      });
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;

