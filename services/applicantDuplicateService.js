'use strict';

const Applicant = require('../models/Applicant');

const {
  normalizeEmail,
  normalizePhone,
  canonicalizeLinkedIn,
} = require('../utils/applicantIdentity');

/*
|--------------------------------------------------------------------------
| Name Normalization
|--------------------------------------------------------------------------
|
| Name is only supplemental evidence.
| It is NEVER enough by itself to mark two applicants as duplicates.
|
*/

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/*
|--------------------------------------------------------------------------
| Build Comparable Identity
|--------------------------------------------------------------------------
|
| Supports:
| - Applicant structure: identity
| - Submission structure: personal
|
*/

function buildIdentitySignals(record = {}) {
  const identity =
    record.identity ||
    record.personal ||
    {};

  const profiles =
    record.profiles || {};

  return {
    fullName:
      normalizeName(
        identity.fullName
      ),

    email:
      identity.normalizedEmail ||
      normalizeEmail(
        identity.email
      ),

    phone:
      identity.normalizedPhone ||
      normalizePhone(
        identity.phoneNumber
      ),

    linkedin:
      profiles.linkedinCanonical ||
      canonicalizeLinkedIn(
        profiles.linkedin
      ),
  };
}

/*
|--------------------------------------------------------------------------
| Compare Two Identities
|--------------------------------------------------------------------------
*/

function compareApplicantIdentity(
  source,
  candidate
) {
  const a =
    buildIdentitySignals(source);

  const b =
    buildIdentitySignals(candidate);

  const matchedSignals = [];

  if (
    a.email &&
    b.email &&
    a.email === b.email
  ) {
    matchedSignals.push('email');
  }

  if (
    a.phone &&
    b.phone &&
    a.phone === b.phone
  ) {
    matchedSignals.push('phone');
  }

  if (
    a.linkedin &&
    b.linkedin &&
    a.linkedin === b.linkedin
  ) {
    matchedSignals.push(
      'linkedin'
    );
  }

  const strongMatchCount =
    matchedSignals.length;

  const nameMatches =
    Boolean(
      a.fullName &&
      b.fullName &&
      a.fullName === b.fullName
    );

  let confidence = 'none';

  if (strongMatchCount >= 2) {
    confidence = 'high';
  } else if (
    strongMatchCount === 1
  ) {
    confidence = 'possible';
  }

  return {
    isPossibleDuplicate:
      strongMatchCount >= 1,

    confidence,

    strongMatchCount,

    matchedSignals,

    nameMatches,
  };
}

/*
|--------------------------------------------------------------------------
| Build Duplicate Candidate Query
|--------------------------------------------------------------------------
|
| Only strong identity signals are queried.
|
| Name alone is deliberately excluded because names are not unique.
|
*/

function buildDuplicateQuery(
  record,
  { excludeApplicantId = null } = {}
) {
  const signals =
    buildIdentitySignals(record);

  const or = [];

  if (signals.email) {
    or.push({
      'identity.normalizedEmail':
        signals.email,
    });
  }

  if (signals.phone) {
    or.push({
      'identity.normalizedPhone':
        signals.phone,
    });
  }

  if (signals.linkedin) {
    or.push({
      'profiles.linkedinCanonical':
        signals.linkedin,
    });
  }

  if (or.length === 0) {
    return null;
  }

  const query = {
    $or: or,
  };

  if (excludeApplicantId) {
    query._id = {
      $ne: excludeApplicantId,
    };
  }

  return query;
}

/*
|--------------------------------------------------------------------------
| Find Duplicate Candidates
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| - READ ONLY
| - no merge
| - no delete
| - no profile update
| - archived Applicants are still returned because they may represent
|   the same real person and should be visible during manual review.
|
*/

async function findDuplicateCandidates({
  record,
  excludeApplicantId = null,
  ApplicantModel = Applicant,
}) {
  const query =
    buildDuplicateQuery(
      record,
      {
        excludeApplicantId,
      }
    );

  if (!query) {
    return [];
  }

  const candidates =
    await ApplicantModel
      .find(query)
      .select(
        [
          '_id',
          'identity.fullName',
          'identity.email',
          'identity.normalizedEmail',
          'identity.phoneNumber',
          'identity.normalizedPhone',
          'profiles.linkedin',
          'profiles.linkedinCanonical',
          'lifecycle.archived',
        ].join(' ')
      )
      .lean();

  return candidates
    .map((candidate) => {
      const comparison =
        compareApplicantIdentity(
          record,
          candidate
        );

      return {
        applicantId:
          String(candidate._id),

        archived:
          Boolean(
            candidate.lifecycle &&
            candidate.lifecycle.archived
          ),

        ...comparison,
      };
    })
    .filter(
      (candidate) =>
        candidate.isPossibleDuplicate
    )
    .sort(
      (a, b) =>
        b.strongMatchCount -
        a.strongMatchCount
    );
}

module.exports = {
  normalizeName,
  buildIdentitySignals,
  compareApplicantIdentity,
  buildDuplicateQuery,
  findDuplicateCandidates,
};
