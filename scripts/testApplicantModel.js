'use strict';

const assert = require('assert');

const Applicant =
  require('../models/Applicant');

const ApplicantFormSubmission =
  require('../models/ApplicantFormSubmission');

async function run() {
  /*
  |--------------------------------------------------------------------------
  | Relationship
  |--------------------------------------------------------------------------
  */

  const applicantIdPath =
    ApplicantFormSubmission.schema.path(
      'applicantId'
    );

  assert(applicantIdPath);

  assert.strictEqual(
    applicantIdPath.instance,
    'ObjectId'
  );

  assert.strictEqual(
    applicantIdPath.options.ref,
    'Applicant'
  );

  assert.strictEqual(
    Boolean(applicantIdPath.options.required),
    false
  );

  /*
  |--------------------------------------------------------------------------
  | Top-level master profile sections
  |--------------------------------------------------------------------------
  */

  const requiredSections = [
    'identity',
    'education',
    'preferences',
    'skills',
    'profiles',
    'recruitment',
    'lifecycle',
    'profileVersion',
    'latestApprovedSubmissionId',
  ];

  for (const section of requiredSections) {
    assert(
      Applicant.schema.path(section),
      `Missing Applicant section: ${section}`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | In-memory Applicant
  |--------------------------------------------------------------------------
  |
  | No MongoDB connection is used.
  |
  */

  const applicant = new Applicant({
    identity: {
      fullName: 'Test Applicant',
      email: ' TEST.User@Example.COM ',
      phoneNumber: '+961 70 123 456',
      whatsappNumber: '+96170123456',
      country: 'Lebanon',
      city: 'Beirut',
    },

    education: {
      universityName: 'Test University',
      institutionCountry: 'Lebanon',
      degreeLevel: 'Bachelor',
      major: 'Computer Science',
      specialization: 'Software Engineering',
      studyStatus: 'Final Year',
      gpa: '3.2',
      languages: [
        'Arabic',
        'English',
      ],
      englishProficiency: 'B2',
    },

    preferences: {
      positionTrack: 'Software Engineering',
      positionType: 'Internship',
      duration: '3 months',
      weeklyAvailability: '30 hours',
      workingDays: [
        'Monday',
        'Tuesday',
      ],
      workingTime: 'Morning',
      objectives: [
        'Professional experience',
      ],
    },

    skills: {
      primaryTechnical: [
        'JavaScript',
        'Node.js',
      ],
      programmingLanguages: [
        'JavaScript',
        'Python',
      ],
      frameworks: [
        'React',
        'Express',
      ],
      databases: [
        'MongoDB',
      ],
      cloudDevOps: [
        'AWS',
      ],
      developmentTools: [
        'Git',
        'VS Code',
      ],
      softSkills: [
        'Communication',
      ],
    },

    profiles: {
      linkedin:
        'https://www.linkedin.com/in/Test-Applicant/?trk=profile',
      github:
        'https://github.com/test-applicant',
      portfolio:
        'https://example.com',
    },

    recruitment: {
      status: 'reviewed',
      source: 'google-form',
      tags: [
        'backend',
      ],
    },
  });

  await applicant.validate();

  /*
  |--------------------------------------------------------------------------
  | Normalization assertions
  |--------------------------------------------------------------------------
  */

  assert.strictEqual(
    applicant.identity.email,
    'test.user@example.com'
  );

  assert.strictEqual(
    applicant.identity.normalizedEmail,
    'test.user@example.com'
  );

  assert.strictEqual(
    applicant.identity.normalizedPhone,
    '+96170123456'
  );

  assert.strictEqual(
    applicant.profiles.linkedinCanonical,
    'linkedin.com/in/test-applicant'
  );

  /*
  |--------------------------------------------------------------------------
  | Section assertions
  |--------------------------------------------------------------------------
  */

  assert.strictEqual(
    applicant.education.major,
    'Computer Science'
  );

  assert.strictEqual(
    applicant.preferences.positionTrack,
    'Software Engineering'
  );

  assert.deepStrictEqual(
    applicant.skills.programmingLanguages,
    [
      'JavaScript',
      'Python',
    ]
  );

  assert.strictEqual(
    applicant.recruitment.status,
    'reviewed'
  );

  assert.strictEqual(
    applicant.lifecycle.archived,
    false
  );

  assert.strictEqual(
    applicant.profileVersion,
    1
  );

  /*
  |--------------------------------------------------------------------------
  | Index assertions
  |--------------------------------------------------------------------------
  */

  const indexes =
    Applicant.schema.indexes();

  function hasIndex(expected) {
    return indexes.some(
      ([fields]) =>
        JSON.stringify(fields) ===
        JSON.stringify(expected)
    );
  }

  assert(
    hasIndex({
      'identity.normalizedEmail': 1,
    })
  );

  assert(
    hasIndex({
      'identity.normalizedPhone': 1,
    })
  );

  assert(
    hasIndex({
      'profiles.linkedinCanonical': 1,
    })
  );

  assert(
    hasIndex({
      'preferences.positionTrack': 1,
    })
  );

  assert(
    hasIndex({
      'skills.primaryTechnical': 1,
    })
  );

  assert(
    hasIndex({
      'recruitment.status': 1,
    })
  );

  console.log('');
  console.log('================================');
  console.log('✅ CORE APPLICANT MODEL PASSED');
  console.log('================================');
  console.log('✅ Applicant master model');
  console.log('✅ Submission relationship');
  console.log('✅ Email normalization');
  console.log('✅ Phone normalization');
  console.log('✅ LinkedIn canonicalization');
  console.log('✅ Education');
  console.log('✅ Preferences');
  console.log('✅ Skills');
  console.log('✅ Professional profiles');
  console.log('✅ Recruitment state');
  console.log('✅ Lifecycle');
  console.log('✅ Metadata');
  console.log('✅ Schema indexes');
  console.log('✅ No MongoDB writes performed');
}

run().catch((error) => {
  console.error('');
  console.error(
    '❌ Applicant model test failed'
  );

  console.error(error);

  process.exit(1);
});
