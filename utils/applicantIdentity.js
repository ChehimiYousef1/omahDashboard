'use strict';

/*
|--------------------------------------------------------------------------
| Applicant Identity Normalization
|--------------------------------------------------------------------------
|
| These helpers create stable comparison/search values.
|
| Important:
| - They do NOT decide whether two applicants are the same person.
| - They do NOT modify MongoDB.
| - They do NOT guess a phone country code.
|
*/

/*
|--------------------------------------------------------------------------
| Email
|--------------------------------------------------------------------------
*/

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/*
|--------------------------------------------------------------------------
| Phone
|--------------------------------------------------------------------------
|
| Examples:
|
| +961 70 123 456  -> +96170123456
| 00961 70 123456  -> +96170123456
| 70-123-456       -> 70123456
|
| We intentionally do NOT convert a local number such as 70123456
| into +96170123456 automatically because the applicant's country
| cannot always be assumed safely.
|
*/

function normalizePhone(value) {
  let phone = String(value || '').trim();

  if (!phone) {
    return '';
  }

  // International 00-prefix -> +
  if (phone.startsWith('00')) {
    phone = `+${phone.slice(2)}`;
  }

  const hasLeadingPlus = phone.startsWith('+');

  // Keep digits only.
  const digits = phone.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  return hasLeadingPlus
    ? `+${digits}`
    : digits;
}

/*
|--------------------------------------------------------------------------
| LinkedIn
|--------------------------------------------------------------------------
|
| The purpose is comparison/search, not presentation.
|
| Examples:
|
| https://www.linkedin.com/in/john-doe/?trk=abc
| -> linkedin.com/in/john-doe
|
| linkedin.com/in/john-doe/
| -> linkedin.com/in/john-doe
|
*/

function canonicalizeLinkedIn(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  let candidate = raw;

  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);

    let hostname = url.hostname
      .toLowerCase()
      .replace(/^www\./, '')
      .replace(/^m\./, '');

    if (
      hostname !== 'linkedin.com' &&
      !hostname.endsWith('.linkedin.com')
    ) {
      return '';
    }

    hostname = 'linkedin.com';

    let pathname = url.pathname
      .replace(/\/+/g, '/')
      .replace(/\/$/, '')
      .toLowerCase();

    if (!pathname) {
      return hostname;
    }

    return `${hostname}${pathname}`;
  } catch {
    return '';
  }
}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  normalizeEmail,
  normalizePhone,
  canonicalizeLinkedIn,
};
