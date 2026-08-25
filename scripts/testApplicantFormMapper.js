'use strict';

const {
  mapApplicantFormResponse,
} = require('../services/applicantFormMapper');

const row = {
  Timestamp: '25/08/2026 20:30:00',

  'Full Name':
    'Test Applicant',

  'Email Address':
    'TEST@EXAMPLE.COM',

  'Phone Number':
    '+96170000000',

  Country:
    'Lebanon',

  City:
    'Beirut',

  'University / College Name':
    'Lebanese University',

  'Degree Program / Major':
    'Computer Science',

  'Internship / Position Track':
    'Software Engineering',

  'Primary Technical Skills':
    'JavaScript, Node.js, React',

  'Programming Languages You Use':
    'JavaScript, Python',

  'LinkedIn Profile':
    'https://linkedin.com/in/test',

  'GitHub / Code Repository Profile':
    'https://github.com/test',

  'CV / Resume':
    'https://example.com/cv.pdf',
};

const mapped =
  mapApplicantFormResponse(row);

console.log('\n--- MAPPER TEST ---');

console.log(
  'Name:',
  mapped.personal.fullName
);

console.log(
  'Email:',
  mapped.personal.email
);

console.log(
  'Major:',
  mapped.education.major
);

console.log(
  'Position:',
  mapped.preferences.positionTrack
);

console.log(
  'Skills:',
  mapped.skills.primaryTechnical
);

console.log(
  'GitHub:',
  mapped.profiles.github
);

console.log(
  'CV:',
  mapped.documents.cvResume
);

console.log(
  'Timestamp valid:',
  mapped.submittedAt instanceof Date
);

console.log(
  'Raw response preserved:',
  Object.keys(mapped.rawResponse).length > 0
);

console.log('\n✅ Mapper test finished');