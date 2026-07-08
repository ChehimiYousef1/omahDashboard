const Application = require('./Application');
const db = require('./db');
const fs = require('fs');
const path = require('path');

let useMongo = false;

function normalizeSkills(skills) {
  if (Array.isArray(skills)) {
    return skills.map((s) => String(s).trim()).filter(Boolean);
  }
  if (!skills) return [];
  return String(skills)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function toApiFormat(record) {
  const obj = record.toObject ? record.toObject() : record;
  const skills = Array.isArray(obj.skills) ? obj.skills.join(', ') : obj.skills || '';

  return {
    id: obj._id?.toString() || obj.id,
    jobId: obj.jobId || '',
    jobTitle: obj.jobTitle || '',
    companyName: obj.companyName || '',
    userId: obj.userId || 'candidate',
    userName: obj.name || obj.userName || '',
    userEmail: obj.email || obj.userEmail || '',
    phone: obj.phone || '',
    education: obj.education || '',
    skills,
    portfolioUrl: obj.portfolioUrl || '',
    resumeUrl: obj.resumeUrl || '',
    status: obj.status || 'applied',
    appliedDate: obj.appliedDate
      ? new Date(obj.appliedDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    coverLetter: obj.coverLetter || '',
    source: obj.source || (obj.userId === 'sheet-sync' ? 'sheet' : 'api'),
    extraFields: obj.extraFields || {},
  };
}

function fromJsonRecord(record) {
  const appliedDate = record.appliedDate ? new Date(record.appliedDate) : new Date();
  const email = (record.userEmail || record.email || '').toLowerCase().trim();
  const dateStr = appliedDate.toISOString().split('T')[0];

  return {
    name: record.userName || record.name,
    email,
    phone: record.phone || '',
    education: record.education || '',
    skills: normalizeSkills(record.skills),
    portfolioUrl: record.portfolioUrl || '',
    resumeUrl: record.resumeUrl || '',
    coverLetter: record.coverLetter || '',
    jobTitle: record.jobTitle,
    companyName: record.companyName,
    jobId: record.jobId || '',
    status: record.status || 'applied',
    appliedDate,
    source: record.userId === 'sheet-sync' ? 'sheet' : 'manual',
    userId: record.userId || 'candidate',
    syncIdentifier: `${email}_${dateStr}`,
    extraFields: record.extraFields || {},
  };
}

function toJsonRecord(payload, existingId) {
  const appliedDate = payload.appliedDate || new Date().toISOString().split('T')[0];
  return {
    id: existingId || payload.id || `a_${Date.now()}`,
    jobId: payload.jobId || '',
    jobTitle: payload.jobTitle,
    companyName: payload.companyName,
    userId: payload.userId || 'candidate',
    userName: payload.name || payload.userName,
    userEmail: payload.email || payload.userEmail,
    phone: payload.phone || '',
    education: payload.education || '',
    skills: Array.isArray(payload.skills) ? payload.skills.join(', ') : payload.skills || '',
    portfolioUrl: payload.portfolioUrl || '',
    resumeUrl: payload.resumeUrl || '',
    status: payload.status || 'applied',
    appliedDate,
    coverLetter: payload.coverLetter || '',
    source: payload.source || 'api',
    extraFields: payload.extraFields || {},
  };
}

async function init(mongoConnection) {
  if (process.env.DISABLE_MONGO === 'true' || !process.env.MONGODB_URI) {
    useMongo = false;
    console.log('📦 Applications storage: Local JSON File (MongoDB disabled or MONGODB_URI not provided)');
    return;
  }

  try {
    await mongoConnection.connectToMongoDB();
    useMongo = true;
    await importFromJsonIfEmpty();
    console.log('✅ Applications storage: MongoDB');
  } catch (error) {
    useMongo = false;
    console.log('⚠️  MongoDB connection failed — falling back to local JSON file storage');
  }
}

async function importFromJsonIfEmpty() {
  if (!useMongo) return 0;

  const count = await Application.countDocuments();
  if (count > 0) {
    console.log(`MongoDB already has ${count} application(s)`);
    return count;
  }

  const filePath = path.join(__dirname, 'data', 'applications.json');
  if (!fs.existsSync(filePath)) return 0;

  const records = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let imported = 0;

  for (const record of records) {
    try {
      await Application.create(fromJsonRecord(record));
      imported += 1;
    } catch (error) {
      if (error.code !== 11000) {
        console.warn('Import warning:', error.message);
      }
    }
  }

  console.log(`Imported ${imported} application(s) from JSON into MongoDB`);
  return imported;
}

async function getAllApplications() {
  if (useMongo) {
    const docs = await Application.find().sort({ appliedDate: -1, createdAt: -1 });
    return docs.map(toApiFormat);
  }
  const apps = await db.getApplications();
  return apps.map(toApiFormat);
}

async function findApplicationById(id) {
  if (useMongo) {
    const doc = await Application.findById(id);
    return doc ? toApiFormat(doc) : null;
  }
  const apps = await db.getApplications();
  const found = apps.find((a) => a.id === id);
  return found ? toApiFormat(found) : null;
}

async function createApplication(payload) {
  if (useMongo) {
    const appliedDate = new Date();
    const email = payload.email.toLowerCase().trim();
    const dateStr = appliedDate.toISOString().split('T')[0];

    const doc = await Application.create({
      name: payload.name.trim(),
      email,
      phone: payload.phone || '',
      education: payload.education || '',
      skills: normalizeSkills(payload.skills),
      portfolioUrl: payload.portfolioUrl || '',
      resumeUrl: payload.resumeUrl || '',
      coverLetter: payload.coverLetter || '',
      jobTitle: payload.jobTitle,
      companyName: payload.companyName,
      jobId: payload.jobId || '',
      status: 'applied',
      appliedDate,
      source: payload.source || 'api',
      userId: payload.userId || 'candidate',
      syncIdentifier: `${email}_${dateStr}`,
    });
    return toApiFormat(doc);
  }

  const apps = await db.getApplications();
  const record = toJsonRecord({
    ...payload,
    name: payload.name,
    email: payload.email,
    userId: payload.userId || 'candidate',
    source: payload.source || 'api',
  }, `a${apps.length + 1}_${Date.now()}`);
  apps.push(record);
  await db.saveApplications(apps);
  return toApiFormat(record);
}

async function updateApplicationStatus(id, status) {
  if (useMongo) {
    const doc = await Application.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    return doc ? toApiFormat(doc) : null;
  }

  const apps = await db.getApplications();
  const index = apps.findIndex((a) => a.id === id);
  if (index === -1) return null;
  apps[index].status = status;
  await db.saveApplications(apps);
  return toApiFormat(apps[index]);
}

async function deleteApplication(id) {
  if (useMongo) {
    const doc = await Application.findByIdAndDelete(id);
    return doc ? toApiFormat(doc) : null;
  }

  const apps = await db.getApplications();
  const index = apps.findIndex((a) => a.id === id);
  if (index === -1) return null;
  const removed = apps[index];
  apps.splice(index, 1);
  await db.saveApplications(apps);
  return toApiFormat(removed);
}

async function findDuplicate(email, appliedDate) {
  const normalizedEmail = email.toLowerCase().trim();
  const dateStr = new Date(appliedDate).toISOString().split('T')[0];

  if (useMongo) {
    return Application.findOne({
      email: normalizedEmail,
      syncIdentifier: `${normalizedEmail}_${dateStr}`,
    });
  }

  const apps = await db.getApplications();
  return apps.find(
    (app) =>
      app.userEmail.toLowerCase() === normalizedEmail &&
      app.appliedDate === dateStr
  ) || null;
}

async function createFromSheetRow(rowData) {
  const email = rowData.email.toLowerCase().trim();
  const appliedDate = rowData.appliedDate ? new Date(rowData.appliedDate) : new Date();
  const dateStr = appliedDate.toISOString().split('T')[0];

  const duplicate = await findDuplicate(email, appliedDate);
  if (duplicate) return null;

  if (useMongo) {
    const syncIdentifier = `${email}_${dateStr}`;
    const doc = await Application.create({
      name: rowData.name.trim(),
      email,
      phone: rowData.phone || '',
      education: rowData.education || '',
      skills: normalizeSkills(rowData.skills),
      portfolioUrl: rowData.portfolioUrl || '',
      resumeUrl: rowData.resumeUrl || 'https://omahconnect.com/resumes/default_resume.pdf',
      coverLetter: rowData.coverLetter || '',
      jobTitle: rowData.jobTitle,
      companyName: rowData.companyName,
      jobId: rowData.jobId || '',
      status: 'applied',
      appliedDate,
      source: 'sheet',
      userId: 'sheet-sync',
      syncIdentifier,
      extraFields: rowData.extraFields || {},
    });
    return toApiFormat(doc);
  }

  const apps = await db.getApplications();
  const record = {
    id: `a_sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    jobId: rowData.jobId || 'j-sheet',
    jobTitle: rowData.jobTitle,
    companyName: rowData.companyName,
    userId: 'sheet-sync',
    userName: rowData.name.trim(),
    userEmail: email,
    phone: rowData.phone || '',
    education: rowData.education || '',
    skills: rowData.skills || '',
    portfolioUrl: rowData.portfolioUrl || '',
    resumeUrl: rowData.resumeUrl || '',
    status: 'applied',
    appliedDate: dateStr,
    coverLetter: rowData.coverLetter || '',
    source: 'sheet',
    extraFields: rowData.extraFields || {},
  };
  apps.push(record);
  await db.saveApplications(apps);
  return toApiFormat(record);
}

async function getApplicationCount() {
  if (useMongo) return Application.countDocuments();
  const apps = await db.getApplications();
  return apps.length;
}

function isUsingMongo() {
  return useMongo;
}

module.exports = {
  init,
  importFromJsonIfEmpty,
  getAllApplications,
  findApplicationById,
  createApplication,
  updateApplicationStatus,
  deleteApplication,
  findDuplicate,
  createFromSheetRow,
  getApplicationCount,
  toApiFormat,
  isUsingMongo,
};
