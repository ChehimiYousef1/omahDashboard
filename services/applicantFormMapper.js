'use strict';

/*
|--------------------------------------------------------------------------
| Applicant Form Mapper
|--------------------------------------------------------------------------
|
| Converts ONE Google Form / Google Sheet response row into the structure
| expected by models/ApplicantFormSubmission.js.
|
| Responsibilities:
| - Normalize Google Form column headers
| - Read fields using exact names / controlled aliases
| - Normalize text safely
| - Convert checkbox / multi-select answers into arrays
| - Convert Yes / No answers into booleans
| - Parse dates and timestamps conservatively
| - Preserve the complete original form response
|
| IMPORTANT:
| This service DOES NOT:
| - Connect to MongoDB
| - Insert/update/delete database records
| - Generate submissionKey
| - Perform duplicate detection
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Basic helpers
|--------------------------------------------------------------------------
*/

function text(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

/**
 * Normalize Google Sheet header names.
 *
 * Handles:
 * - BOM character sometimes added to first CSV header
 * - non-breaking spaces
 * - en/em dashes
 * - duplicate whitespace
 * - case differences
 */
function normalizeHeader(value) {
  return text(value)
    .replace(/^\uFEFF/, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

/*
|--------------------------------------------------------------------------
| Header reader
|--------------------------------------------------------------------------
*/

/**
 * Safely get a value from a Google Form response row.
 *
 * Example:
 *
 * getValue(row, 'Email Address', 'Email')
 */
function getValue(row, ...possibleHeaders) {
  if (
    !row ||
    typeof row !== 'object' ||
    Array.isArray(row)
  ) {
    return '';
  }

  const normalizedRow = new Map();

  for (const [key, value] of Object.entries(row)) {
    normalizedRow.set(
      normalizeHeader(key),
      value
    );
  }

  for (const header of possibleHeaders) {
    const normalizedHeader =
      normalizeHeader(header);

    if (normalizedRow.has(normalizedHeader)) {
      return normalizedRow.get(
        normalizedHeader
      );
    }
  }

  return '';
}

/*
|--------------------------------------------------------------------------
| Array / checkbox parser
|--------------------------------------------------------------------------
*/

/**
 * Converts Google Forms checkbox or comma-separated answers into arrays.
 *
 * Empty:
 * ""
 * -> []
 *
 * Example:
 * "React, Node.js, Python"
 * -> ["React", "Node.js", "Python"]
 */
function list(value) {
  if (
    value === null ||
    value === undefined ||
    text(value) === ''
  ) {
    return [];
  }

  const values = Array.isArray(value)
    ? value
    : String(value).split(/[,;\n]+/);

  return values
    .map((item) => text(item))
    .filter(Boolean);
}

/*
|--------------------------------------------------------------------------
| Boolean parser
|--------------------------------------------------------------------------
*/

/**
 * true  = explicitly positive answer
 * false = explicitly negative answer
 * null  = unanswered / unknown
 */
function booleanValue(value) {
  const normalized =
    text(value).toLowerCase();

  const trueValues = new Set([
    'yes',
    'true',
    '1',
    'y',
    'available',
  ]);

  const falseValues = new Set([
    'no',
    'false',
    '0',
    'n',
    'not available',
  ]);

  if (trueValues.has(normalized)) {
    return true;
  }

  if (falseValues.has(normalized)) {
    return false;
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Strict date helpers
|--------------------------------------------------------------------------
*/

/**
 * Creates a date and verifies that JavaScript did not silently roll
 * an invalid date into another month.
 *
 * Example:
 * 31/02/2026 must return null.
 */
function createValidatedDate(
  year,
  month,
  day
) {
  const parsed = new Date(
    year,
    month - 1,
    day
  );

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

/**
 * Strict date parser.
 *
 * Supported:
 * DD/MM/YYYY
 * YYYY-MM-DD
 *
 * Unknown formats return null instead of being guessed.
 */
function parseDate(value) {
  const raw = text(value);

  if (!raw) {
    return null;
  }

  // DD/MM/YYYY
  let match = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  );

  if (match) {
    const [, day, month, year] = match;

    return createValidatedDate(
      Number(year),
      Number(month),
      Number(day)
    );
  }

  // YYYY-MM-DD
  match = raw.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  );

  if (match) {
    const [, year, month, day] = match;

    return createValidatedDate(
      Number(year),
      Number(month),
      Number(day)
    );
  }

  /*
   * Do NOT use generic:
   *
   * new Date(raw)
   *
   * here because ambiguous values such as
   * 08/09/2026 could be interpreted differently
   * depending on environment/locale.
   */

  return null;
}

/*
|--------------------------------------------------------------------------
| Google Forms timestamp parser
|--------------------------------------------------------------------------
*/

/**
 * Current expected Google Forms timestamp:
 *
 * DD/MM/YYYY HH:mm:ss
 * DD/MM/YYYY HH:mm
 *
 * Also accepts proper ISO-8601 timestamps.
 *
 * We deliberately do NOT guess ambiguous US/EU timestamps.
 */
function parseTimestamp(value) {
  const raw = text(value);

  if (!raw) {
    return null;
  }

  /*
   * DD/MM/YYYY HH:mm:ss
   * DD/MM/YYYY HH:mm
   */
  let match = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );

  if (match) {
    const [
      ,
      day,
      month,
      year,
      hour,
      minute,
      second = '0',
    ] = match;

    const numericYear = Number(year);
    const numericMonth = Number(month);
    const numericDay = Number(day);
    const numericHour = Number(hour);
    const numericMinute = Number(minute);
    const numericSecond = Number(second);

    if (
      numericHour < 0 ||
      numericHour > 23 ||
      numericMinute < 0 ||
      numericMinute > 59 ||
      numericSecond < 0 ||
      numericSecond > 59
    ) {
      return null;
    }

    const parsed = new Date(
      numericYear,
      numericMonth - 1,
      numericDay,
      numericHour,
      numericMinute,
      numericSecond
    );

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !==
        numericYear ||
      parsed.getMonth() !==
        numericMonth - 1 ||
      parsed.getDate() !==
        numericDay ||
      parsed.getHours() !==
        numericHour ||
      parsed.getMinutes() !==
        numericMinute ||
      parsed.getSeconds() !==
        numericSecond
    ) {
      return null;
    }

    return parsed;
  }

  /*
   * ISO-8601 only.
   *
   * Example:
   * 2026-08-25T20:30:00+03:00
   * 2026-08-25T17:30:00Z
   */
  const isoPattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

  if (isoPattern.test(raw)) {
    const parsed = new Date(raw);

    return Number.isNaN(parsed.getTime())
      ? null
      : parsed;
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Main mapper
|--------------------------------------------------------------------------
*/

function mapApplicantFormResponse(row) {
  if (
    !row ||
    typeof row !== 'object' ||
    Array.isArray(row)
  ) {
    throw new TypeError(
      'Applicant form row must be a plain object.'
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Core values
  |--------------------------------------------------------------------------
  */

  const submittedAt = parseTimestamp(
    getValue(
      row,
      'Timestamp'
    )
  );

  const fullName = text(
    getValue(
      row,
      'Full Name',
      'Name'
    )
  );

  const email = text(
    getValue(
      row,
      'Email Address',
      'Email',
      'E-mail Address'
    )
  ).toLowerCase();

  const positionTrack = text(
    getValue(
      row,
      'Internship / Position Track',
      'Internship / Position',
      'Position Track'
    )
  );

  return {
    formVersion: 2,

    source: 'google-form',

    submittedAt,

    /*
    |--------------------------------------------------------------------------
    | Personal Information
    |--------------------------------------------------------------------------
    */

    personal: {
      fullName,

      email,

      phoneNumber: text(
        getValue(
          row,
          'Phone Number',
          'Mobile Number'
        )
      ),

      country: text(
        getValue(
          row,
          'Country'
        )
      ),

      city: text(
        getValue(
          row,
          'City'
        )
      ),

      whatsappAvailable:
        booleanValue(
          getValue(
            row,
            'Is Your Phone Number Available on WhatsApp?'
          )
        ),

      whatsappNumber: text(
        getValue(
          row,
          'WhatsApp Number (if different)',
          'WhatsApp Number'
        )
      ),
    },

    /*
    |--------------------------------------------------------------------------
    | Education & Qualifications
    |--------------------------------------------------------------------------
    */

    education: {
      universityName: text(
        getValue(
          row,
          'University / College Name'
        )
      ),

      institutionCountry: text(
        getValue(
          row,
          'Country of Institution'
        )
      ),

      degreeLevel: text(
        getValue(
          row,
          'Degree Level'
        )
      ),

      major: text(
        getValue(
          row,
          'Degree Program / Major'
        )
      ),

      specialization: text(
        getValue(
          row,
          'Specialization / Concentration'
        )
      ),

      studyStatus: text(
        getValue(
          row,
          'Current Study Status'
        )
      ),

      graduationDate: parseDate(
        getValue(
          row,
          'Expected / Actual Graduation Date'
        )
      ),

      gpa: text(
        getValue(
          row,
          'GPA / Academic Average'
        )
      ),

      gradingScale: text(
        getValue(
          row,
          'Grading System / Scale'
        )
      ),

      relevantCoursework: text(
        getValue(
          row,
          'Relevant Coursework'
        )
      ),

      academicProjects: text(
        getValue(
          row,
          'Relevant Academic or Personal Projects'
        )
      ),

      hasCertifications:
        booleanValue(
          getValue(
            row,
            'Do You Have Relevant Certifications?'
          )
        ),

      certificateNames: text(
        getValue(
          row,
          'Certificate / Qualification Names'
        )
      ),

      languages: list(
        getValue(
          row,
          'Languages'
        )
      ),

      englishProficiency: text(
        getValue(
          row,
          'English Proficiency Level'
        )
      ),

      additionalEducation: text(
        getValue(
          row,
          'Additional Education, Courses, or Training'
        )
      ),
    },

    /*
    |--------------------------------------------------------------------------
    | Internship / Position Preferences
    |--------------------------------------------------------------------------
    */

    preferences: {
      positionTrack,

      positionType: text(
        getValue(
          row,
          'Preferred Internship / Position Type'
        )
      ),

      availableStartDate:
        parseDate(
          getValue(
            row,
            'Available Start Date',
            'Keep as Available Start Date'
          )
        ),

      duration: text(
        getValue(
          row,
          'Preferred Internship / Position Duration'
        )
      ),

      weeklyAvailability: text(
        getValue(
          row,
          'Weekly Availability',
          'Keep as Weekly Availability'
        )
      ),

      workingDays: list(
        getValue(
          row,
          'Preferred Working Days'
        )
      ),

      workingTime: text(
        getValue(
          row,
          'Preferred Working Time'
        )
      ),

      currentlyEmployed: text(
        getValue(
          row,
          'Are You Currently Employed, Interning, or Working Elsewhere?'
        )
      ),

      currentCommitment: text(
        getValue(
          row,
          'If Yes, Please Briefly Explain Your Current Commitment'
        )
      ),

      canCommit: text(
        getValue(
          row,
          'Are You Able to Commit to the Internship / Position Schedule?'
        )
      ),

      objectives: list(
        getValue(
          row,
          'Main Objective for This Internship / Position'
        )
      ),

      universityRequired: text(
        getValue(
          row,
          'Is This Internship / Position Required by Your University or Educational Institution?'
        )
      ),

      universityRequiredDuration:
        text(
          getValue(
            row,
            'If Required by Your University or Educational Institution, Please Specify the Required Duration or Hours'
          )
        ),
    },

    /*
    |--------------------------------------------------------------------------
    | Skills & Professional Experience
    |--------------------------------------------------------------------------
    */

    skills: {
      primaryTechnical: list(
        getValue(
          row,
          'Primary Technical Skills'
        )
      ),

      otherTechnical: text(
        getValue(
          row,
          'Other Technical Skills'
        )
      ),

      technicalExperienceLevel:
        text(
          getValue(
            row,
            'Overall Technical Experience Level'
          )
        ),

      professionalExperience:
        text(
          getValue(
            row,
            'Approximate Professional Experience'
          )
        ),

      previousExperience: text(
        getValue(
          row,
          'Previous Internship / Work Experience'
        )
      ),

      previousExperienceDetails:
        text(
          getValue(
            row,
            'Previous Work / Internship / Position Details'
          )
        ),

      programmingLanguages: list(
        getValue(
          row,
          'Programming Languages You Use'
        )
      ),

      frameworks: list(
        getValue(
          row,
          'Frameworks / Libraries You Have Experience With'
        )
      ),

      databases: list(
        getValue(
          row,
          'Databases You Have Experience With'
        )
      ),

      cloudDevOps: list(
        getValue(
          row,
          'Cloud / DevOps Tools'
        )
      ),

      developmentTools: list(
        getValue(
          row,
          'Development Tools'
        )
      ),

      softSkills: list(
        getValue(
          row,
          'Soft Skills'
        )
      ),

      dataEngineerSkills: list(
        getValue(
          row,
          'Data Engineer — recommended skills',
          'Data Engineer - recommended skills'
        )
      ),

      aiMlEngineerSkills: list(
        getValue(
          row,
          'AI / Machine Learning Engineer — recommended skills',
          'AI / Machine Learning Engineer - recommended skills'
        )
      ),

      dataAnalystSkills: list(
        getValue(
          row,
          'Data Analyst — recommended skills',
          'Data Analyst - recommended skills'
        )
      ),

      skillsToImprove: text(
        getValue(
          row,
          'Skills You Would Like to Improve During the Internship / Position'
        )
      ),

      additionalSkills: text(
        getValue(
          row,
          'Additional Skills or Experience'
        )
      ),
    },

    /*
    |--------------------------------------------------------------------------
    | Professional Profiles
    |--------------------------------------------------------------------------
    */

    profiles: {
      linkedin: text(
        getValue(
          row,
          'LinkedIn Profile'
        )
      ),

      github: text(
        getValue(
          row,
          'GitHub / Code Repository Profile'
        )
      ),

      portfolio: text(
        getValue(
          row,
          'Portfolio / Personal Website'
        )
      ),

      socialMedia: text(
        getValue(
          row,
          'Other Professional or Social Media Profile'
        )
      ),
    },

    /*
    |--------------------------------------------------------------------------
    | Documents & Supporting Information
    |--------------------------------------------------------------------------
    */

    documents: {
      cvResume: text(
        getValue(
          row,
          'CV / Resume'
        )
      ),

      identityDocument: text(
        getValue(
          row,
          'Identity Document / ID Card'
        )
      ),

      enrollmentDocument: text(
        getValue(
          row,
          'University / Enrolment Document',
          'University / Enrollment Document'
        )
      ),

      degreeCertificate: text(
        getValue(
          row,
          'Degree / Graduation Certificate'
        )
      ),

      trainingCertificates: list(
        getValue(
          row,
          'Professional / Training Certificates'
        )
      ),

      recommendationLetters: list(
        getValue(
          row,
          'Recommendation Letter(s)'
        )
      ),

      portfolioWorkSamples: list(
        getValue(
          row,
          'Portfolio / Work Samples'
        )
      ),

      additionalSupportingDocuments:
        list(
          getValue(
            row,
            'Additional Supporting Documents'
          )
        ),
    },

    /*
    |--------------------------------------------------------------------------
    | Recruitment defaults
    |--------------------------------------------------------------------------
    */

    recruitment: {
      status: 'applied',
      rating: null,
      notes: '',
    },

    /*
    |--------------------------------------------------------------------------
    | Preserve original Google Form response
    |--------------------------------------------------------------------------
    |
    | Nothing from the original response is discarded.
    | Even an unmapped future field remains available here.
    |
    */

    rawResponse: {
      ...row,
    },
  };
}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  mapApplicantFormResponse,
  getValue,
  normalizeHeader,
  text,
  list,
  booleanValue,
  parseDate,
  parseTimestamp,
};