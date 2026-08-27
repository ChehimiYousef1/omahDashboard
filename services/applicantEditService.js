'use strict';

const Applicant =
  require('../models/Applicant');

const {
  normalizeEmail,
  normalizePhone,
  canonicalizeLinkedIn,
} = require('../utils/applicantIdentity');

const {
  PROFILE_FIELD_MAP,
} = require('./applicantProfileService');

const {
  toObjectId,
} = require('./applicantSubmissionService');

/*
|--------------------------------------------------------------------------
| Errors
|--------------------------------------------------------------------------
*/

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/*
|--------------------------------------------------------------------------
| Editable Applicant Fields
|--------------------------------------------------------------------------
|
| Manual edits use the SAME destination-field whitelist used by the
| submission approval workflow.
|
| This prevents the API/UI from editing protected system fields such as:
|
| - applicantCode
| - profileVersion
| - latestApprovedSubmissionId
| - recruitment.status
| - lifecycle.*
| - normalized identity companion fields
|
*/

const EDITABLE_PROFILE_FIELDS =
  new Set(
    Object.keys(PROFILE_FIELD_MAP)
  );

/*
|--------------------------------------------------------------------------
| Clone Editable Values
|--------------------------------------------------------------------------
*/

function cloneValue(value) {
  if (Array.isArray(value)) {
    return [...value];
  }

  return value;
}

/*
|--------------------------------------------------------------------------
| Build Manual Applicant Update
|--------------------------------------------------------------------------
|
| PURE FUNCTION
|
| Input example:
|
| {
|   "identity.fullName": "New Name",
|   "identity.email": "Person@Example.com",
|   "skills.frameworks": ["React", "Node.js"]
| }
|
| This function:
|
| - allows only whitelisted current-profile fields
| - allows legitimate clearing values such as "", false and []
| - rejects undefined values
| - synchronizes normalized identity fields
| - never changes system-controlled fields
|
*/

function buildManualApplicantUpdate(
  changes
) {
  if (
    !changes ||
    typeof changes !== 'object' ||
    Array.isArray(changes)
  ) {
    throw serviceError(
      'EDIT_CHANGES_REQUIRED',
      'Applicant profile changes must be provided as an object.'
    );
  }

  const entries =
    Object.entries(changes);

  if (entries.length === 0) {
    throw serviceError(
      'EDIT_CHANGES_REQUIRED',
      'At least one Applicant profile field must be edited.'
    );
  }

  const update = {};

  for (const [field, value] of entries) {
    if (!EDITABLE_PROFILE_FIELDS.has(field)) {
      throw serviceError(
        'PROFILE_FIELD_NOT_EDITABLE',
        `Applicant profile field is not editable: ${field}`
      );
    }

    if (value === undefined) {
      throw serviceError(
        'EDIT_VALUE_UNDEFINED',
        `Applicant profile field cannot be undefined: ${field}`
      );
    }

    update[field] =
      cloneValue(value);

    /*
     * System-controlled normalized companions.
     */
    if (field === 'identity.email') {
      update[
        'identity.normalizedEmail'
      ] = normalizeEmail(value);
    }

    if (
      field ===
      'identity.phoneNumber'
    ) {
      update[
        'identity.normalizedPhone'
      ] = normalizePhone(value);
    }

    if (
      field ===
      'profiles.linkedin'
    ) {
      update[
        'profiles.linkedinCanonical'
      ] =
        canonicalizeLinkedIn(value);
    }
  }

  return update;
}

/*
|--------------------------------------------------------------------------
| Edit Current Applicant Profile
|--------------------------------------------------------------------------
|
| Rules:
|
| 1. Applicant must exist.
| 2. Archived Applicants cannot be manually edited.
| 3. Only current-profile whitelist fields can change.
| 4. Normalized identity fields are system-controlled.
| 5. profileVersion increments atomically.
| 6. latestApprovedSubmissionId is NOT changed.
| 7. ApplicantFormSubmission records are never changed.
|
*/

async function editApplicantProfile({
  applicantId,
  changes,
  ApplicantModel = Applicant,
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const update =
    buildManualApplicantUpdate(
      changes
    );

  const result =
    await ApplicantModel.updateOne(
      {
        _id: applicantObjectId,

        'lifecycle.archived': {
          $ne: true,
        },
      },
      {
        $set: update,

        $inc: {
          profileVersion: 1,
        },
      },
      {
        runValidators: true,
      }
    );

  if (result.matchedCount !== 1) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found or is archived.'
    );
  }

  return {
    status: 'profile-edited',

    applicantId:
      String(applicantObjectId),

    editedFields:
      Object.keys(changes),
  };
}

module.exports = {
  EDITABLE_PROFILE_FIELDS,
  buildManualApplicantUpdate,
  editApplicantProfile,
};
