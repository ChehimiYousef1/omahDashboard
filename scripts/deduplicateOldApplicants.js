const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "../data/applications.json");

const outputPath = path.join(
  __dirname,
  "../data/old_applicant_form_data_without_duplication.json"
);

const reportPath = path.join(
  __dirname,
  "../data/old_applicant_duplicate_report.json"
);

// Read original data
const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));

const rows = Array.isArray(raw)
  ? raw
  : raw.applications || raw.data || [];

console.log(`Original records: ${rows.length}`);

// Normalize email
function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

// Compare application dates
function getDate(applicant) {
  const value = applicant.appliedDate;

  if (!value) return 0;

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

const unique = new Map();
const noEmail = [];
const duplicateReport = [];

rows.forEach((applicant, index) => {
  const email = normalizeEmail(applicant.userEmail);

  // Never automatically remove applicants without email
  if (!email) {
    noEmail.push(applicant);
    return;
  }

  if (!unique.has(email)) {
    unique.set(email, {
      applicant,
      originalIndex: index,
    });

    return;
  }

  const existing = unique.get(email);

  const existingDate = getDate(existing.applicant);
  const newDate = getDate(applicant);

  let keepNew = false;

  // Newer application wins
  if (newDate > existingDate) {
    keepNew = true;
  }

  // If dates are equal or unavailable,
  // keep the later occurrence in the file
  if (newDate === existingDate && index > existing.originalIndex) {
    keepNew = true;
  }

  const kept = keepNew
    ? applicant
    : existing.applicant;

  const removed = keepNew
    ? existing.applicant
    : applicant;

  duplicateReport.push({
    email,
    keptId: kept.id,
    removedId: removed.id,
    keptName: kept.userName,
    removedName: removed.userName,
    keptAppliedDate: kept.appliedDate,
    removedAppliedDate: removed.appliedDate,
  });

  if (keepNew) {
    unique.set(email, {
      applicant,
      originalIndex: index,
    });
  }
});

// Final cleaned dataset
const cleanedApplicants = [
  ...Array.from(unique.values()).map(entry => entry.applicant),
  ...noEmail,
];

// Save cleaned historical data
fs.writeFileSync(
  outputPath,
  JSON.stringify(cleanedApplicants, null, 2),
  "utf8"
);

// Save audit report
fs.writeFileSync(
  reportPath,
  JSON.stringify(duplicateReport, null, 2),
  "utf8"
);

console.log("");
console.log("Deduplication completed.");
console.log(`Original records: ${rows.length}`);
console.log(`Clean records: ${cleanedApplicants.length}`);
console.log(
  `Duplicates removed from cleaned copy: ${
    rows.length - cleanedApplicants.length
  }`
);
console.log(`Applicants without email preserved: ${noEmail.length}`);

console.log("");
console.log("Created:");
console.log(
  "data/old_applicant_form_data_without_duplication.json"
);
console.log(
  "data/old_applicant_duplicate_report.json"
);

console.log("");
console.log("Original applications.json was NOT modified.");