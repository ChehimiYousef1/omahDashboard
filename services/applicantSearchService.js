'use strict';

const Applicant = require('../models/Applicant');
const {
  APPLICANT_STATUSES,
} = require('../utils/applicantStatus');

const MAX_SEARCH_LENGTH = 120;
const MAX_FILTER_LENGTH = 100;
const MAX_PAGE_SIZE = 200;

const SORT_FIELDS = Object.freeze({
  lastActivityAt: 'recruitment.lastActivityAt',
  firstAppliedAt: 'recruitment.firstAppliedAt',
  lastAppliedAt: 'recruitment.lastAppliedAt',
  fullName: 'identity.fullName',
  status: 'recruitment.status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
});

const SEARCH_FIELDS = Object.freeze([
  'applicantCode',
  'identity.fullName',
  'identity.email',
  'identity.normalizedEmail',
  'identity.phoneNumber',
  'identity.normalizedPhone',
  'identity.whatsappNumber',
  'identity.country',
  'identity.city',
  'education.universityName',
  'education.institutionCountry',
  'education.degreeLevel',
  'education.major',
  'education.specialization',
  'preferences.positionTrack',
  'preferences.positionType',
  'skills.primaryTechnical',
  'skills.otherTechnical',
  'skills.programmingLanguages',
  'skills.frameworks',
  'skills.databases',
  'skills.cloudDevOps',
  'skills.developmentTools',
  'skills.additionalSkills',
  'profiles.linkedin',
  'profiles.github',
  'profiles.portfolio',
  'recruitment.tags',
]);

const SKILL_FIELDS = Object.freeze([
  'skills.primaryTechnical',
  'skills.otherTechnical',
  'skills.programmingLanguages',
  'skills.frameworks',
  'skills.databases',
  'skills.cloudDevOps',
  'skills.developmentTools',
  'skills.dataEngineerSkills',
  'skills.aiMlEngineerSkills',
  'skills.dataAnalystSkills',
  'skills.additionalSkills',
]);

function searchError(message, code) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 400;
  return error;
}

function single(value, name) {
  if (value === undefined || value === null || value === '') return null;

  if (Array.isArray(value) || typeof value === 'object') {
    throw searchError(
      `${name} must contain one value.`,
      'INVALID_SEARCH_PARAMETER'
    );
  }

  return String(value).trim();
}

function bounded(value, name, maxLength = MAX_FILTER_LENGTH) {
  const normalized = single(value, name);
  if (!normalized) return null;

  if (normalized.length > maxLength) {
    throw searchError(
      `${name} must be ${maxLength} characters or fewer.`,
      'SEARCH_PARAMETER_TOO_LONG'
    );
  }

  return normalized;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsRegex(value) {
  return new RegExp(escapeRegex(value), 'i');
}

function exactRegex(value) {
  return new RegExp(`^${escapeRegex(value)}$`, 'i');
}

function positiveInt(value, name, fallback, maximum = null) {
  if (value === undefined || value === null || value === '') return fallback;

  const parsed = Number(single(value, name));

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw searchError(
      `${name} must be a positive integer.`,
      `INVALID_${name.toUpperCase()}`
    );
  }

  if (maximum !== null && parsed > maximum) {
    throw searchError(
      `${name} cannot exceed ${maximum}.`,
      `INVALID_${name.toUpperCase()}`
    );
  }

  return parsed;
}

function booleanValue(value, name) {
  const text = bounded(value, name, 5);
  if (text === null) return null;
  if (text === 'true') return true;
  if (text === 'false') return false;

  throw searchError(
    `${name} must be true or false.`,
    `INVALID_${name.toUpperCase()}`
  );
}

function archiveValue(value) {
  const text = bounded(value, 'archived', 5) || 'false';

  if (!['false', 'true', 'all'].includes(text)) {
    throw searchError(
      'archived must be false, true, or all.',
      'INVALID_ARCHIVED_FILTER'
    );
  }

  return text;
}

function dateValue(value, name, endOfDay = false) {
  const text = bounded(value, name, 40);
  if (!text) return null;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
  const date = new Date(
    dateOnly
      ? `${text}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
      : text
  );

  if (Number.isNaN(date.getTime())) {
    throw searchError(
      `${name} must be a valid date.`,
      `INVALID_${name.toUpperCase()}`
    );
  }

  return date;
}

function buildApplicantSearchQuery(query = {}) {
  const filters = [];
  const appliedFilters = {};

  const archived = archiveValue(query.archived);
  appliedFilters.archived = archived;

  if (archived === 'true') {
    filters.push({ 'lifecycle.archived': true });
  } else if (archived === 'false') {
    filters.push({ 'lifecycle.archived': { $ne: true } });
  }

  const q = bounded(query.q, 'q', MAX_SEARCH_LENGTH);

  if (q) {
    const regex = containsRegex(q);
    filters.push({
      $or: SEARCH_FIELDS.map((field) => ({ [field]: regex })),
    });
    appliedFilters.q = q;
  }

  const status = bounded(query.status, 'status', 40);

  if (status) {
    if (!APPLICANT_STATUSES.includes(status)) {
      throw searchError(
        `Unknown applicant status: ${status}`,
        'INVALID_STATUS_FILTER'
      );
    }

    filters.push({ 'recruitment.status': status });
    appliedFilters.status = status;
  }

  const exactFields = [
    ['positionTrack', 'preferences.positionTrack'],
    ['positionType', 'preferences.positionType'],
    ['country', 'identity.country'],
    ['city', 'identity.city'],
    ['source', 'recruitment.source'],
    ['assignedRecruiterId', 'recruitment.assignedRecruiterId'],
  ];

  for (const [parameter, path] of exactFields) {
    const value = bounded(query[parameter], parameter);

    if (value) {
      filters.push({ [path]: exactRegex(value) });
      appliedFilters[parameter] = value;
    }
  }

  const skill = bounded(query.skill, 'skill');

  if (skill) {
    const regex = containsRegex(skill);
    filters.push({
      $or: SKILL_FIELDS.map((field) => ({ [field]: regex })),
    });
    appliedFilters.skill = skill;
  }

  const tag = bounded(query.tag, 'tag');

  if (tag) {
    filters.push({ 'recruitment.tags': exactRegex(tag) });
    appliedFilters.tag = tag;
  }

  for (const [parameter, path] of [
    ['hasLinkedIn', 'profiles.linkedin'],
    ['hasGitHub', 'profiles.github'],
  ]) {
    const wanted = booleanValue(query[parameter], parameter);

    if (wanted !== null) {
      filters.push(
        wanted
          ? { [path]: { $exists: true, $nin: [null, ''] } }
          : {
              $or: [
                { [path]: { $exists: false } },
                { [path]: null },
                { [path]: '' },
              ],
            }
      );

      appliedFilters[parameter] = wanted;
    }
  }

  const appliedFrom = dateValue(query.appliedFrom, 'appliedFrom');
  const appliedTo = dateValue(query.appliedTo, 'appliedTo', true);

  if (appliedFrom && appliedTo && appliedFrom > appliedTo) {
    throw searchError(
      'appliedFrom cannot be after appliedTo.',
      'INVALID_APPLIED_DATE_RANGE'
    );
  }

  if (appliedFrom || appliedTo) {
    const range = {};

    if (appliedFrom) {
      range.$gte = appliedFrom;
      appliedFilters.appliedFrom = appliedFrom.toISOString();
    }

    if (appliedTo) {
      range.$lte = appliedTo;
      appliedFilters.appliedTo = appliedTo.toISOString();
    }

    filters.push({ 'recruitment.firstAppliedAt': range });
  }

  const page = positiveInt(query.page, 'page', 1);
  const limit = positiveInt(query.limit, 'limit', 50, MAX_PAGE_SIZE);

  const sortBy = bounded(query.sortBy, 'sortBy', 40) || 'lastActivityAt';

  if (!Object.prototype.hasOwnProperty.call(SORT_FIELDS, sortBy)) {
    throw searchError(
      `Unsupported sort field: ${sortBy}`,
      'INVALID_SORT_FIELD'
    );
  }

  const sortOrder =
    bounded(query.sortOrder, 'sortOrder', 4) || 'desc';

  if (!['asc', 'desc'].includes(sortOrder)) {
    throw searchError(
      'sortOrder must be asc or desc.',
      'INVALID_SORT_ORDER'
    );
  }

  appliedFilters.sortBy = sortBy;
  appliedFilters.sortOrder = sortOrder;

  return {
    filter:
      filters.length === 0
        ? {}
        : filters.length === 1
          ? filters[0]
          : { $and: filters },

    page,
    limit,
    skip: (page - 1) * limit,

    sort: {
      [SORT_FIELDS[sortBy]]: sortOrder === 'asc' ? 1 : -1,
      _id: sortOrder === 'asc' ? 1 : -1,
    },

    appliedFilters,
  };
}

async function searchApplicants({
  query = {},
  ApplicantModel = Applicant,
} = {}) {
  const search = buildApplicantSearchQuery(query);

  const [applicants, total] = await Promise.all([
    ApplicantModel.find(search.filter)
      .sort(search.sort)
      .skip(search.skip)
      .limit(search.limit)
      .lean(),

    ApplicantModel.countDocuments(search.filter),
  ]);

  return {
    applicants,
    pagination: {
      page: search.page,
      limit: search.limit,
      total,
      pages: Math.ceil(total / search.limit) || 0,
    },
    filters: search.appliedFilters,
  };
}

function normalizeDistinctValues(values) {
  return [
    ...new Set(
      values
        .flat(Infinity)
        .filter((value) => typeof value === 'string' && value.trim())
        .map((value) => value.trim())
    ),
  ]
    .sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    )
    .slice(0, 250);
}

async function getApplicantSearchOptions({
  ApplicantModel = Applicant,
} = {}) {
  const activeFilter = {
    'lifecycle.archived': { $ne: true },
  };

  const [
    tracks,
    positionTypes,
    countries,
    cities,
    sources,
    tags,
  ] = await Promise.all([
    ApplicantModel.distinct('preferences.positionTrack', activeFilter),
    ApplicantModel.distinct('preferences.positionType', activeFilter),
    ApplicantModel.distinct('identity.country', activeFilter),
    ApplicantModel.distinct('identity.city', activeFilter),
    ApplicantModel.distinct('recruitment.source', activeFilter),
    ApplicantModel.distinct('recruitment.tags', activeFilter),
  ]);

  return {
    statuses: [...APPLICANT_STATUSES],
    tracks: normalizeDistinctValues(tracks),
    positionTypes: normalizeDistinctValues(positionTypes),
    countries: normalizeDistinctValues(countries),
    cities: normalizeDistinctValues(cities),
    sources: normalizeDistinctValues(sources),
    tags: normalizeDistinctValues(tags),
    sortFields: Object.keys(SORT_FIELDS),
  };
}

module.exports = {
  MAX_PAGE_SIZE,
  SEARCH_FIELDS,
  SKILL_FIELDS,
  SORT_FIELDS,
  buildApplicantSearchQuery,
  escapeRegex,
  getApplicantSearchOptions,
  normalizeDistinctValues,
  searchApplicants,
};
