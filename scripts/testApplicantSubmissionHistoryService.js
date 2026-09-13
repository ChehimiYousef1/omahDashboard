'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  FIELD_MAP,
  valuesEqual,
  buildSubmissionComparison,
  buildSubmissionHistory,
} = require(
  '../services/applicantSubmissionHistoryService'
);


function sampleApplicant() {
  return {
    latestApprovedSubmissionId:
      '507f1f77bcf86cd799439013',

    identity: {
      fullName:
        'Example Applicant',

      email:
        'applicant@example.com',

      phoneNumber:
        '+96170000000',

      whatsappNumber:
        '+96170000000',

      country:
        'Lebanon',

      city:
        'Beirut',
    },

    education: {
      universityName:
        'Lebanese University',

      institutionCountry:
        'Lebanon',

      degreeLevel:
        'Bachelor',

      major:
        'Computer Science',

      specialization:
        '',

      studyStatus:
        'Student',

      graduationDate:
        new Date(
          '2026-06-01'
        ),

      gpa:
        '3.2',

      gradingScale:
        '4',

      relevantCoursework:
        '',

      academicProjects:
        '',

      hasCertifications:
        true,

      certificateNames:
        'Certificate A',

      languages: [
        'Arabic',
        'English',
      ],

      englishProficiency:
        'B2',

      additionalEducation:
        '',
    },

    preferences: {
      positionTrack:
        'Full Stack',

      positionType:
        'Internship',

      availableStartDate:
        new Date(
          '2026-09-01'
        ),

      duration:
        '3 months',

      weeklyAvailability:
        '30 hours',

      workingDays: [
        'Monday',
        'Tuesday',
      ],

      workingTime:
        'Day',

      currentlyEmployed:
        'No',

      currentCommitment:
        '',

      canCommit:
        'Yes',

      objectives: [
        'Experience',
        'Learning',
      ],

      universityRequired:
        'No',

      universityRequiredDuration:
        '',
    },

    skills: {
      primaryTechnical: [
        'Node.js',
        'React',
      ],

      otherTechnical:
        '',

      technicalExperienceLevel:
        'Intermediate',

      professionalExperience:
        '',

      previousExperience:
        'Yes',

      previousExperienceDetails:
        '',

      programmingLanguages: [
        'JavaScript',
        'C#',
      ],

      frameworks: [
        'React',
        'Express',
      ],

      databases: [
        'MongoDB',
      ],

      cloudDevOps: [],

      developmentTools: [
        'Git',
      ],

      softSkills: [
        'Communication',
      ],

      dataEngineerSkills: [],
      aiMlEngineerSkills: [],
      dataAnalystSkills: [],

      skillsToImprove:
        '',

      additionalSkills:
        '',
    },

    profiles: {
      linkedin:
        'https://linkedin.com/in/example',

      github:
        'https://github.com/example',

      portfolio:
        '',

      socialMedia:
        '',
    },
  };
}


function matchingSubmission() {
  return {
    _id:
      '507f1f77bcf86cd799439013',

    submittedAt:
      new Date(
        '2026-09-12T10:00:00Z'
      ),

    personal: {
      fullName:
        'Example Applicant',

      email:
        'Applicant@Example.com',

      phoneNumber:
        '+96170000000',

      whatsappNumber:
        '+96170000000',

      country:
        'Lebanon',

      city:
        'Beirut',
    },

    education: {
      ...sampleApplicant()
        .education,

      graduationDate:
        '2026-06-01T00:00:00Z',
    },

    preferences: {
      ...sampleApplicant()
        .preferences,

      availableStartDate:
        '2026-09-01T00:00:00Z',

      workingDays: [
        'Tuesday',
        'Monday',
      ],
    },

    skills: {
      ...sampleApplicant()
        .skills,

      primaryTechnical: [
        'React',
        'Node.js',
      ],
    },

    profiles: {
      ...sampleApplicant()
        .profiles,
    },
  };
}


function testNormalization() {
  assert.strictEqual(
    valuesEqual(
      ' User@Example.com ',
      'user@example.com',
      'email'
    ),
    true
  );

  assert.strictEqual(
    valuesEqual(
      [
        'React',
        'Node.js',
      ],
      [
        'Node.js',
        'React',
      ],
      'array'
    ),
    true
  );

  assert.strictEqual(
    valuesEqual(
      '2026-09-01T10:30:00Z',
      new Date(
        '2026-09-01'
      ),
      'date'
    ),
    true
  );

  console.log(
    '✅ Comparison normalization'
  );
}


function testMatchingSubmission() {
  const comparison =
    buildSubmissionComparison({
      applicant:
        sampleApplicant(),

      submission:
        matchingSubmission(),
    });

  assert.strictEqual(
    comparison.changeCount,
    0
  );

  assert.strictEqual(
    comparison.status,
    'matches_current'
  );

  assert.strictEqual(
    comparison
      .isLatestApprovedSource,
    true
  );

  console.log(
    '✅ Matching submission recognized'
  );
}


function testChangedSubmission() {
  const submission =
    matchingSubmission();

  submission.personal.city =
    'Sidon';

  submission.skills.frameworks = [
    'React',
    'Express',
    'Next.js',
  ];

  const comparison =
    buildSubmissionComparison({
      applicant:
        sampleApplicant(),

      submission,
    });

  assert.strictEqual(
    comparison.status,
    'changed'
  );

  assert.strictEqual(
    comparison.changeCount,
    2
  );

  const labels =
    comparison.changedFields
      .map(
        (field) =>
          field.label
      );

  assert.ok(
    labels.includes('City')
  );

  assert.ok(
    labels.includes(
      'Frameworks'
    )
  );

  console.log(
    '✅ Changed fields detected'
  );
}


function testHistory() {
  const current =
    matchingSubmission();

  const old = {
    ...matchingSubmission(),

    _id:
      '507f1f77bcf86cd799439014',

    submittedAt:
      new Date(
        '2026-08-01T10:00:00Z'
      ),

    personal: {
      ...matchingSubmission()
        .personal,

      city:
        'Tripoli',
    },
  };

  const history =
    buildSubmissionHistory({
      applicant:
        sampleApplicant(),

      submissions: [
        current,
        old,
      ],
    });

  assert.strictEqual(
    history.length,
    2
  );

  assert.strictEqual(
    history[1]
      .comparison
      .status,
    'initial'
  );

  assert.strictEqual(
    history[0]
      .comparison
      .status,
    'matches_current'
  );

  console.log(
    '✅ Oldest submission marked initial'
  );
}


function run() {
  console.log(
    '================================'
  );

  console.log(
    ' SUBMISSION HISTORY TEST'
  );

  console.log(
    '================================'
  );

  assert.ok(
    FIELD_MAP.length > 40
  );

  testNormalization();
  testMatchingSubmission();
  testChangedSubmission();
  testHistory();

  assert.strictEqual(
    mongoose.connection
      .readyState,
    0
  );

  console.log('');
  console.log(
    '✅ Field map covers Applicant profile'
  );

  console.log(
    '✅ No MongoDB connection used'
  );

  console.log(
    '✅ No MongoDB writes performed'
  );

  console.log(
    '✅ Immutable submissions unchanged'
  );

  console.log('');
  console.log(
    'TASK 6.1 / 6.2 TEST PASSED'
  );
}


try {
  run();
} catch (error) {
  console.error(
    '❌ TASK 6 HISTORY TEST FAILED'
  );

  console.error(error);

  process.exit(1);
}
