'use strict';

const mongoose =
  require('mongoose');

const Applicant =
  require(
    '../models/Applicant'
  );


const TALENT_POOL_PRIORITIES =
  Object.freeze([
    'normal',
    'medium',
    'high',
  ]);


const TALENT_POOL_EDITABLE_FIELDS =
  Object.freeze([
    'categoryId',
    'roles',
    'priority',
    'ownerId',
    'source',
    'reason',
    'nextReviewAt',
  ]);


function serviceError(
  code,
  message
) {
  const error =
    new Error(
      message
    );

  error.code =
    code;

  return error;
}


function cleanText(
  value
) {
  return String(
    value ?? ''
  ).trim();
}


function normalizeStringList(
  value,
  {
    fieldName =
      'values',

    maxItems =
      50,

    maxLength =
      160,
  } = {}
) {
  if (
    value === undefined ||
    value === null
  ) {
    return [];
  }

  if (
    !Array.isArray(value)
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      `${fieldName} must be an array.`
    );
  }

  const seen =
    new Set();

  const result =
    [];

  for (
    const raw
    of value
  ) {
    const item =
      cleanText(raw);

    if (!item) {
      continue;
    }

    if (
      item.length >
      maxLength
    ) {
      throw serviceError(
        'INVALID_TALENT_POOL_INPUT',
        `${fieldName} contains a value that is too long.`
      );
    }

    const key =
      item.toLocaleLowerCase(
        'en'
      );

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    result.push(
      item
    );

    if (
      result.length >
      maxItems
    ) {
      throw serviceError(
        'INVALID_TALENT_POOL_INPUT',
        `${fieldName} exceeds the maximum allowed values.`
      );
    }
  }

  return result;
}


function normalizePriority(
  value
) {
  const priority =
    cleanText(value)
      .toLowerCase();

  if (
    !TALENT_POOL_PRIORITIES
      .includes(priority)
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      `Talent Pool priority must be one of: ${TALENT_POOL_PRIORITIES.join(', ')}.`
    );
  }

  return priority;
}


function normalizeObjectId(
  value,
  fieldName
) {
  const id =
    cleanText(value);

  if (
    !mongoose.Types
      .ObjectId
      .isValid(id)
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      `${fieldName} must be a valid ObjectId.`
    );
  }

  return id;
}


function normalizeNullableDate(
  value,
  fieldName
) {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null ||
    value === ''
  ) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      `${fieldName} must be a valid date.`
    );
  }

  return date;
}


function normalizeReason(
  value,
  fieldName =
    'reason'
) {
  const reason =
    cleanText(value);

  if (
    reason.length >
    2000
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      `${fieldName} is too long.`
    );
  }

  return reason;
}


function normalizeMembershipInput(
  input = {},
  {
    partial =
      false,
  } = {}
) {
  if (
    !input ||
    typeof input !==
      'object' ||
    Array.isArray(input)
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      'Talent Pool membership payload must be an object.'
    );
  }

  const allowed =
    new Set(
      TALENT_POOL_EDITABLE_FIELDS
    );

  for (
    const key
    of Object.keys(input)
  ) {
    if (
      !allowed.has(key)
    ) {
      throw serviceError(
        'INVALID_TALENT_POOL_INPUT',
        `Unsupported Talent Pool membership field: ${key}`
      );
    }
  }

  const output =
    {};


  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'categoryId'
      )
  ) {
    output.categoryId =
      normalizeObjectId(
        input.categoryId,
        'categoryId'
      );
  } else if (!partial) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      'Talent Pool categoryId is required.'
    );
  }


  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'roles'
      )
  ) {
    output.roles =
      normalizeStringList(
        input.roles,
        {
          fieldName:
            'roles',

          maxItems:
            30,
        }
      );
  } else if (!partial) {
    output.roles =
      [];
  }


  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'priority'
      )
  ) {
    output.priority =
      normalizePriority(
        input.priority
      );
  } else if (!partial) {
    output.priority =
      'normal';
  }


  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'ownerId'
      )
  ) {
    output.ownerId =
      cleanText(
        input.ownerId
      );
  } else if (!partial) {
    output.ownerId =
      '';
  }


  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'source'
      )
  ) {
    const source =
      cleanText(
        input.source
      );

    if (
      source.length >
      120
    ) {
      throw serviceError(
        'INVALID_TALENT_POOL_INPUT',
        'Talent Pool source is too long.'
      );
    }

    output.source =
      source ||
      'manual';
  } else if (!partial) {
    output.source =
      'manual';
  }


  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'reason'
      )
  ) {
    output.reason =
      normalizeReason(
        input.reason
      );
  } else if (!partial) {
    output.reason =
      '';
  }


  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'nextReviewAt'
      )
  ) {
    output.nextReviewAt =
      normalizeNullableDate(
        input.nextReviewAt,
        'nextReviewAt'
      );
  } else if (!partial) {
    output.nextReviewAt =
      null;
  }


  if (
    partial &&
    Object.keys(output)
      .length === 0
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_INPUT',
      'At least one editable Talent Pool field is required.'
    );
  }


  return output;
}


function startOfLocalDay(
  value
) {
  const date =
    new Date(value);

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}


function deriveReviewStatus(
  talentPool = {},
  {
    now =
      new Date(),
  } = {}
) {
  if (
    !talentPool ||
    talentPool.active !==
      true
  ) {
    return 'inactive';
  }

  const next =
    talentPool.nextReviewAt
      ? new Date(
          talentPool.nextReviewAt
        )
      : null;

  if (
    !next ||
    Number.isNaN(
      next.getTime()
    )
  ) {
    if (
      talentPool
        .lastReviewedAt
    ) {
      return 'reviewed';
    }

    return 'not_scheduled';
  }

  const todayStart =
    startOfLocalDay(
      now
    );

  const tomorrowStart =
    new Date(
      todayStart
    );

  tomorrowStart.setDate(
    tomorrowStart.getDate() +
      1
  );

  if (
    next <
    todayStart
  ) {
    return 'overdue';
  }

  if (
    next <
    tomorrowStart
  ) {
    return 'due';
  }

  return 'scheduled';
}


function safeTalentPoolView(
  applicant
) {
  const source =
    applicant?.talentPool ||
    {};

  return {
    active:
      source.active ===
      true,

    categoryId:
      source.categoryId
        ? String(
            source.categoryId
          )
        : null,

    roles:
      Array.isArray(
        source.roles
      )
        ? [
            ...source.roles,
          ]
        : [],

    priority:
      source.priority ||
      'normal',

    ownerId:
      cleanText(
        source.ownerId
      ),

    source:
      cleanText(
        source.source
      ),

    reason:
      cleanText(
        source.reason
      ),

    addedAt:
      source.addedAt ||
      null,

    addedBy:
      cleanText(
        source.addedBy
      ),

    lastReviewedAt:
      source.lastReviewedAt ||
      null,

    lastReviewedBy:
      cleanText(
        source.lastReviewedBy
      ),

    nextReviewAt:
      source.nextReviewAt ||
      null,

    reviewStatus:
      deriveReviewStatus(
        source
      ),

    removedAt:
      source.removedAt ||
      null,

    removedBy:
      cleanText(
        source.removedBy
      ),

    restoredAt:
      source.restoredAt ||
      null,

    restoredBy:
      cleanText(
        source.restoredBy
      ),
  };
}


module.exports = {
  Applicant,

  TALENT_POOL_PRIORITIES,
  TALENT_POOL_EDITABLE_FIELDS,

  serviceError,
  cleanText,
  normalizeStringList,
  normalizePriority,
  normalizeObjectId,
  normalizeNullableDate,
  normalizeReason,
  normalizeMembershipInput,

  startOfLocalDay,
  deriveReviewStatus,
  safeTalentPoolView,
};


/*
|--------------------------------------------------------------------------
| B5D1 — Talent Pool Membership Lifecycle
|--------------------------------------------------------------------------
*/


const {
  getTalentPoolCategory,
  listTalentPoolCategories,
} =
  require(
    './applicantTalentPoolCategoryService'
  );


function actorIdentifier(
  actor = {}
) {
  return cleanText(
    actor.id ||
    actor._id ||
    actor.email ||
    actor.name
  );
}


function assertApplicantId(
  applicantId
) {
  const id =
    cleanText(
      applicantId
    );

  if (
    !mongoose.Types.ObjectId
      .isValid(id)
  ) {
    throw serviceError(
      'INVALID_APPLICANT_ID',
      'Applicant id is invalid.'
    );
  }

  return id;
}


function hasTalentPoolHistory(
  applicant
) {
  const talentPool =
    applicant?.talentPool;

  if (!talentPool) {
    return false;
  }

  return Boolean(
    talentPool.active === true ||
    talentPool.categoryId ||
    talentPool.addedAt ||
    talentPool.removedAt ||
    talentPool.restoredAt
  );
}


function assertApplicantAvailable(
  applicant
) {
  if (
    applicant
      ?.lifecycle
      ?.archived === true
  ) {
    throw serviceError(
      'APPLICANT_ARCHIVED',
      'Archived Applicants cannot be managed in the Talent Pool.'
    );
  }
}


async function loadTalentPoolApplicant({
  applicantId,

  ApplicantModel =
    Applicant,
} = {}) {
  const id =
    assertApplicantId(
      applicantId
    );

  const applicant =
    await ApplicantModel
      .findById(id);

  if (!applicant) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found.'
    );
  }

  return applicant;
}


async function assertActiveTalentPoolCategory({
  categoryId,

  CategoryModel,
} = {}) {
  try {
    return await getTalentPoolCategory({
      categoryId,

      includeArchived:
        false,

      CategoryModel,
    });
  } catch (error) {
    if (
      error?.code ===
        'INVALID_TALENT_POOL_CATEGORY_ID' ||
      error?.code ===
        'TALENT_POOL_CATEGORY_NOT_FOUND'
    ) {
      throw serviceError(
        'INVALID_TALENT_POOL_CATEGORY',
        'Talent Pool category does not exist or is archived.'
      );
    }

    throw error;
  }
}


function ensureTalentPoolObject(
  applicant
) {
  if (!applicant.talentPool) {
    applicant.talentPool =
      {};
  }

  return applicant.talentPool;
}


function assertActiveMembership(
  applicant
) {
  if (
    !hasTalentPoolHistory(
      applicant
    )
  ) {
    throw serviceError(
      'TALENT_POOL_MEMBERSHIP_NOT_FOUND',
      'Applicant has no Talent Pool membership.'
    );
  }

  if (
    applicant.talentPool
      ?.active !== true
  ) {
    throw serviceError(
      'TALENT_POOL_MEMBERSHIP_CONFLICT',
      'Talent Pool membership is inactive. Restore it before editing.'
    );
  }
}


function applyMembershipFields(
  talentPool,
  normalized
) {
  for (
    const field
    of TALENT_POOL_EDITABLE_FIELDS
  ) {
    if (
      Object.prototype
        .hasOwnProperty
        .call(
          normalized,
          field
        )
    ) {
      talentPool[field] =
        normalized[field];
    }
  }
}


function safeApplicantTalentPoolView(
  applicant,
  {
    category =
      null,
  } = {}
) {
  const identity =
    applicant?.identity ||
    {};

  const education =
    applicant?.education ||
    {};

  const preferences =
    applicant?.preferences ||
    {};

  const skills =
    applicant?.skills ||
    {};

  const recruitment =
    applicant?.recruitment ||
    {};

  return {
    id:
      applicant?._id
        ? String(
            applicant._id
          )
        : '',

    applicantCode:
      cleanText(
        applicant?.applicantCode
      ),

    identity: {
      fullName:
        cleanText(
          identity.fullName
        ),

      email:
        cleanText(
          identity.email
        ),

      phoneNumber:
        cleanText(
          identity.phoneNumber
        ),

      country:
        cleanText(
          identity.country
        ),

      city:
        cleanText(
          identity.city
        ),
    },

    education: {
      universityName:
        cleanText(
          education.universityName
        ),

      institutionCountry:
        cleanText(
          education.institutionCountry
        ),

      degreeLevel:
        cleanText(
          education.degreeLevel
        ),

      major:
        cleanText(
          education.major
        ),

      specialization:
        cleanText(
          education.specialization
        ),
    },

    preferences: {
      positionTrack:
        cleanText(
          preferences.positionTrack
        ),

      positionType:
        cleanText(
          preferences.positionType
        ),

      availableStartDate:
        preferences.availableStartDate ||
        null,

      weeklyAvailability:
        cleanText(
          preferences.weeklyAvailability
        ),
    },

    skills: {
      primaryTechnical:
        Array.isArray(
          skills.primaryTechnical
        )
          ? [
              ...skills.primaryTechnical,
            ]
          : [],

      technicalExperienceLevel:
        cleanText(
          skills.technicalExperienceLevel
        ),

      programmingLanguages:
        Array.isArray(
          skills.programmingLanguages
        )
          ? [
              ...skills.programmingLanguages,
            ]
          : [],

      frameworks:
        Array.isArray(
          skills.frameworks
        )
          ? [
              ...skills.frameworks,
            ]
          : [],

      databases:
        Array.isArray(
          skills.databases
        )
          ? [
              ...skills.databases,
            ]
          : [],

      cloudDevOps:
        Array.isArray(
          skills.cloudDevOps
        )
          ? [
              ...skills.cloudDevOps,
            ]
          : [],

      developmentTools:
        Array.isArray(
          skills.developmentTools
        )
          ? [
              ...skills.developmentTools,
            ]
          : [],

      dataEngineerSkills:
        Array.isArray(
          skills.dataEngineerSkills
        )
          ? [
              ...skills.dataEngineerSkills,
            ]
          : [],

      aiMlEngineerSkills:
        Array.isArray(
          skills.aiMlEngineerSkills
        )
          ? [
              ...skills.aiMlEngineerSkills,
            ]
          : [],

      dataAnalystSkills:
        Array.isArray(
          skills.dataAnalystSkills
        )
          ? [
              ...skills.dataAnalystSkills,
            ]
          : [],
    },

    recruitment: {
      status:
        cleanText(
          recruitment.status
        ),

      assignedRecruiterId:
        cleanText(
          recruitment.assignedRecruiterId
        ),

      tags:
        Array.isArray(
          recruitment.tags
        )
          ? [
              ...recruitment.tags,
            ]
          : [],
    },

    talentPool:
      safeTalentPoolView(
        applicant
      ),

    category:
      category ||
      null,
  };
}


async function resolveTalentPoolCategory(
  applicant,
  {
    CategoryModel,
  } = {}
) {
  const categoryId =
    applicant
      ?.talentPool
      ?.categoryId;

  if (!categoryId) {
    return null;
  }

  try {
    return await getTalentPoolCategory({
      categoryId:
        String(categoryId),

      includeArchived:
        true,

      CategoryModel,
    });
  } catch (error) {
    if (
      error?.code ===
        'TALENT_POOL_CATEGORY_NOT_FOUND'
    ) {
      return null;
    }

    throw error;
  }
}


async function getTalentPoolMembership({
  applicantId,

  ApplicantModel =
    Applicant,

  CategoryModel,
} = {}) {
  const applicant =
    await loadTalentPoolApplicant({
      applicantId,
      ApplicantModel,
    });

  if (
    applicant
      ?.lifecycle
      ?.archived === true
  ) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found.'
    );
  }

  if (
    !hasTalentPoolHistory(
      applicant
    )
  ) {
    throw serviceError(
      'TALENT_POOL_MEMBERSHIP_NOT_FOUND',
      'Applicant has no Talent Pool membership.'
    );
  }

  const category =
    await resolveTalentPoolCategory(
      applicant,
      {
        CategoryModel,
      }
    );

  return safeApplicantTalentPoolView(
    applicant,
    {
      category,
    }
  );
}


async function addTalentPoolMembership({
  applicantId,
  input,
  actor = {},

  ApplicantModel =
    Applicant,

  CategoryModel,

  now =
    () =>
      new Date(),
} = {}) {
  const applicant =
    await loadTalentPoolApplicant({
      applicantId,
      ApplicantModel,
    });

  assertApplicantAvailable(
    applicant
  );

  if (
    applicant
      ?.talentPool
      ?.active === true
  ) {
    throw serviceError(
      'TALENT_POOL_MEMBERSHIP_CONFLICT',
      'Applicant is already active in the Talent Pool.'
    );
  }

  if (
    hasTalentPoolHistory(
      applicant
    )
  ) {
    throw serviceError(
      'TALENT_POOL_MEMBERSHIP_CONFLICT',
      'Applicant already has Talent Pool history. Use restore instead of creating a new membership.'
    );
  }

  const normalized =
    normalizeMembershipInput(
      input,
      {
        partial:
          false,
      }
    );

  const category =
    await assertActiveTalentPoolCategory({
      categoryId:
        normalized.categoryId,

      CategoryModel,
    });

  const talentPool =
    ensureTalentPoolObject(
      applicant
    );

  applyMembershipFields(
    talentPool,
    normalized
  );

  talentPool.active =
    true;

  talentPool.addedAt =
    now();

  talentPool.addedBy =
    actorIdentifier(
      actor
    );

  talentPool.lastReviewedAt =
    null;

  talentPool.lastReviewedBy =
    '';

  talentPool.removedAt =
    null;

  talentPool.removedBy =
    '';

  talentPool.removalReason =
    '';

  talentPool.restoredAt =
    null;

  talentPool.restoredBy =
    '';

  await applicant.save();

  return safeApplicantTalentPoolView(
    applicant,
    {
      category,
    }
  );
}


async function replaceTalentPoolMembership({
  applicantId,
  input,
  actor = {},

  ApplicantModel =
    Applicant,

  CategoryModel,
} = {}) {
  const applicant =
    await loadTalentPoolApplicant({
      applicantId,
      ApplicantModel,
    });

  assertApplicantAvailable(
    applicant
  );

  assertActiveMembership(
    applicant
  );

  const normalized =
    normalizeMembershipInput(
      input,
      {
        partial:
          false,
      }
    );

  const category =
    await assertActiveTalentPoolCategory({
      categoryId:
        normalized.categoryId,

      CategoryModel,
    });

  applyMembershipFields(
    applicant.talentPool,
    normalized
  );

  /*
   * Actor is accepted now so B5H can add
   * structured Audit without changing the API.
   */
  void actor;

  await applicant.save();

  return safeApplicantTalentPoolView(
    applicant,
    {
      category,
    }
  );
}


async function patchTalentPoolMembership({
  applicantId,
  input,
  actor = {},

  ApplicantModel =
    Applicant,

  CategoryModel,
} = {}) {
  const applicant =
    await loadTalentPoolApplicant({
      applicantId,
      ApplicantModel,
    });

  assertApplicantAvailable(
    applicant
  );

  assertActiveMembership(
    applicant
  );

  const normalized =
    normalizeMembershipInput(
      input,
      {
        partial:
          true,
      }
    );

  let category =
    await resolveTalentPoolCategory(
      applicant,
      {
        CategoryModel,
      }
    );

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        normalized,
        'categoryId'
      )
  ) {
    category =
      await assertActiveTalentPoolCategory({
        categoryId:
          normalized.categoryId,

        CategoryModel,
      });
  }

  applyMembershipFields(
    applicant.talentPool,
    normalized
  );

  void actor;

  await applicant.save();

  return safeApplicantTalentPoolView(
    applicant,
    {
      category,
    }
  );
}


async function removeTalentPoolMembership({
  applicantId,
  reason = '',
  actor = {},

  ApplicantModel =
    Applicant,

  CategoryModel,

  now =
    () =>
      new Date(),
} = {}) {
  const applicant =
    await loadTalentPoolApplicant({
      applicantId,
      ApplicantModel,
    });

  assertApplicantAvailable(
    applicant
  );

  assertActiveMembership(
    applicant
  );

  const talentPool =
    applicant.talentPool;

  talentPool.active =
    false;

  talentPool.removedAt =
    now();

  talentPool.removedBy =
    actorIdentifier(
      actor
    );

  talentPool.removalReason =
    normalizeReason(
      reason,
      'removalReason'
    );

  /*
   * Removed membership cannot retain an active
   * revisit schedule.
   */
  talentPool.nextReviewAt =
    null;

  await applicant.save();

  const category =
    await resolveTalentPoolCategory(
      applicant,
      {
        CategoryModel,
      }
    );

  return safeApplicantTalentPoolView(
    applicant,
    {
      category,
    }
  );
}


async function restoreTalentPoolMembership({
  applicantId,
  actor = {},

  ApplicantModel =
    Applicant,

  CategoryModel,

  now =
    () =>
      new Date(),
} = {}) {
  const applicant =
    await loadTalentPoolApplicant({
      applicantId,
      ApplicantModel,
    });

  assertApplicantAvailable(
    applicant
  );

  if (
    !hasTalentPoolHistory(
      applicant
    )
  ) {
    throw serviceError(
      'TALENT_POOL_MEMBERSHIP_NOT_FOUND',
      'Applicant has no Talent Pool membership to restore.'
    );
  }

  if (
    applicant
      ?.talentPool
      ?.active === true
  ) {
    throw serviceError(
      'TALENT_POOL_MEMBERSHIP_CONFLICT',
      'Talent Pool membership is already active.'
    );
  }

  const categoryId =
    applicant
      ?.talentPool
      ?.categoryId;

  if (!categoryId) {
    throw serviceError(
      'TALENT_POOL_MEMBERSHIP_CONFLICT',
      'Talent Pool membership cannot be restored without a category.'
    );
  }

  let category;

  try {
    category =
      await assertActiveTalentPoolCategory({
        categoryId:
          String(categoryId),

        CategoryModel,
      });
  } catch (error) {
    if (
      error?.code ===
        'INVALID_TALENT_POOL_CATEGORY'
    ) {
      throw serviceError(
        'TALENT_POOL_MEMBERSHIP_CONFLICT',
        'Talent Pool membership category is archived or unavailable.'
      );
    }

    throw error;
  }

  applicant.talentPool.active =
    true;

  applicant.talentPool.restoredAt =
    now();

  applicant.talentPool.restoredBy =
    actorIdentifier(
      actor
    );

  /*
   * Revisit scheduling is explicit.
   * Restoring membership does not restore an old
   * potentially stale review date.
   */
  applicant.talentPool.nextReviewAt =
    null;

  await applicant.save();

  return safeApplicantTalentPoolView(
    applicant,
    {
      category,
    }
  );
}


Object.assign(
  module.exports,
  {
    actorIdentifier,
    assertApplicantId,
    hasTalentPoolHistory,
    assertApplicantAvailable,
    loadTalentPoolApplicant,
    assertActiveTalentPoolCategory,
    ensureTalentPoolObject,
    assertActiveMembership,
    applyMembershipFields,
    safeApplicantTalentPoolView,
    resolveTalentPoolCategory,

    getTalentPoolMembership,
    addTalentPoolMembership,
    replaceTalentPoolMembership,
    patchTalentPoolMembership,
    removeTalentPoolMembership,
    restoreTalentPoolMembership,
  }
);


/*
|--------------------------------------------------------------------------
| B5D2 — Talent Pool Discovery
|--------------------------------------------------------------------------
*/


const {
  APPLICANT_STATUSES,
} =
  require(
    '../utils/applicantStatus'
  );


const TALENT_POOL_MAX_PAGE_SIZE =
  200;


const TALENT_POOL_REVIEW_STATUSES =
  Object.freeze([
    'inactive',
    'not_scheduled',
    'scheduled',
    'due',
    'overdue',
    'reviewed',
  ]);


const TALENT_POOL_SEARCH_FIELDS =
  Object.freeze([
    'applicantCode',
    'identity.fullName',
    'identity.email',
    'identity.normalizedEmail',
    'identity.phoneNumber',
    'identity.normalizedPhone',
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
    'skills.dataEngineerSkills',
    'skills.aiMlEngineerSkills',
    'skills.dataAnalystSkills',
    'skills.additionalSkills',
    'recruitment.tags',
    'talentPool.roles',
  ]);


const TALENT_POOL_SKILL_FIELDS =
  Object.freeze([
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


const TALENT_POOL_SORT_FIELDS =
  Object.freeze({
    addedAt:
      'talentPool.addedAt',

    nextReviewAt:
      'talentPool.nextReviewAt',

    lastReviewedAt:
      'talentPool.lastReviewedAt',

    fullName:
      'identity.fullName',

    createdAt:
      'createdAt',

    updatedAt:
      'updatedAt',
  });


function talentPoolSearchError(
  message,
  code =
    'INVALID_TALENT_POOL_SEARCH'
) {
  return serviceError(
    code,
    message
  );
}


function talentPoolSingle(
  value,
  name
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  if (
    Array.isArray(value) ||
    typeof value ===
      'object'
  ) {
    throw talentPoolSearchError(
      `${name} must contain one value.`
    );
  }

  return String(
    value
  ).trim();
}


function talentPoolBounded(
  value,
  name,
  maxLength =
    120
) {
  const normalized =
    talentPoolSingle(
      value,
      name
    );

  if (!normalized) {
    return null;
  }

  if (
    normalized.length >
    maxLength
  ) {
    throw talentPoolSearchError(
      `${name} must be ${maxLength} characters or fewer.`
    );
  }

  return normalized;
}


function talentPoolEscapeRegex(
  value
) {
  return String(
    value
  ).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}


function talentPoolContainsRegex(
  value
) {
  return new RegExp(
    talentPoolEscapeRegex(
      value
    ),
    'i'
  );
}


function talentPoolExactRegex(
  value
) {
  return new RegExp(
    `^${talentPoolEscapeRegex(
      value
    )}$`,
    'i'
  );
}


function talentPoolPositiveInt(
  value,
  name,
  fallback,
  maximum =
    null
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return fallback;
  }

  const parsed =
    Number(
      talentPoolSingle(
        value,
        name
      )
    );

  if (
    !Number.isInteger(
      parsed
    ) ||
    parsed < 1
  ) {
    throw talentPoolSearchError(
      `${name} must be a positive integer.`
    );
  }

  if (
    maximum !== null &&
    parsed > maximum
  ) {
    throw talentPoolSearchError(
      `${name} cannot exceed ${maximum}.`
    );
  }

  return parsed;
}


function normalizeTalentPoolActiveFilter(
  value
) {
  const normalized =
    talentPoolBounded(
      value,
      'active',
      5
    );

  if (!normalized) {
    return 'true';
  }

  const lowered =
    normalized.toLowerCase();

  if (
    ![
      'true',
      'false',
      'all',
    ].includes(
      lowered
    )
  ) {
    throw talentPoolSearchError(
      'active must be true, false, or all.'
    );
  }

  return lowered;
}


function normalizeTalentPoolReviewStatus(
  value
) {
  const normalized =
    talentPoolBounded(
      value,
      'reviewStatus',
      30
    );

  if (!normalized) {
    return null;
  }

  const lowered =
    normalized.toLowerCase();

  if (
    !TALENT_POOL_REVIEW_STATUSES
      .includes(
        lowered
      )
  ) {
    throw talentPoolSearchError(
      `reviewStatus must be one of: ${TALENT_POOL_REVIEW_STATUSES.join(', ')}.`
    );
  }

  return lowered;
}


function buildTalentPoolReviewFilter(
  reviewStatus,
  {
    now =
      new Date(),
  } = {}
) {
  if (!reviewStatus) {
    return null;
  }

  if (
    reviewStatus ===
    'inactive'
  ) {
    return {
      'talentPool.active': {
        $ne:
          true,
      },
    };
  }

  const todayStart =
    startOfLocalDay(
      now
    );

  const tomorrowStart =
    new Date(
      todayStart
    );

  tomorrowStart.setDate(
    tomorrowStart.getDate() +
    1
  );

  if (
    reviewStatus ===
    'overdue'
  ) {
    return {
      'talentPool.active':
        true,

      'talentPool.nextReviewAt': {
        $lt:
          todayStart,
      },
    };
  }

  if (
    reviewStatus ===
    'due'
  ) {
    return {
      'talentPool.active':
        true,

      'talentPool.nextReviewAt': {
        $gte:
          todayStart,

        $lt:
          tomorrowStart,
      },
    };
  }

  if (
    reviewStatus ===
    'scheduled'
  ) {
    return {
      'talentPool.active':
        true,

      'talentPool.nextReviewAt': {
        $gte:
          tomorrowStart,
      },
    };
  }

  if (
    reviewStatus ===
    'reviewed'
  ) {
    return {
      'talentPool.active':
        true,

      $and: [
        {
          $or: [
            {
              'talentPool.nextReviewAt': {
                $exists:
                  false,
              },
            },

            {
              'talentPool.nextReviewAt':
                null,
            },
          ],
        },

        {
          'talentPool.lastReviewedAt': {
            $exists:
              true,

            $ne:
              null,
          },
        },
      ],
    };
  }

  return {
    'talentPool.active':
      true,

    $and: [
      {
        $or: [
          {
            'talentPool.nextReviewAt': {
              $exists:
                false,
            },
          },

          {
            'talentPool.nextReviewAt':
              null,
          },
        ],
      },

      {
        $or: [
          {
            'talentPool.lastReviewedAt': {
              $exists:
                false,
            },
          },

          {
            'talentPool.lastReviewedAt':
              null,
          },
        ],
      },
    ],
  };
}


function buildTalentPoolDiscoveryQuery(
  query = {},
  {
    now =
      new Date(),
  } = {}
) {
  const filters =
    [];

  const appliedFilters =
    {};

  /*
   * Archived Applicants never appear inside
   * Talent Pool discovery.
   */
  filters.push({
    'lifecycle.archived': {
      $ne:
        true,
    },
  });


  const reviewStatus =
    normalizeTalentPoolReviewStatus(
      query.reviewStatus
    );

  const active =
    normalizeTalentPoolActiveFilter(
      query.active
    );

  appliedFilters.active =
    active;

  if (reviewStatus) {
    appliedFilters.reviewStatus =
      reviewStatus;

    filters.push(
      buildTalentPoolReviewFilter(
        reviewStatus,
        {
          now,
        }
      )
    );
  } else if (
    active ===
    'true'
  ) {
    filters.push({
      'talentPool.active':
        true,
    });
  } else if (
    active ===
    'false'
  ) {
    filters.push({
      'talentPool.active': {
        $ne:
          true,
      },
    });
  }


  const q =
    talentPoolBounded(
      query.q,
      'q'
    );

  if (q) {
    const regex =
      talentPoolContainsRegex(
        q
      );

    filters.push({
      $or:
        TALENT_POOL_SEARCH_FIELDS
          .map(
            field => ({
              [field]:
                regex,
            })
          ),
    });

    appliedFilters.q =
      q;
  }


  const categoryId =
    talentPoolBounded(
      query.categoryId,
      'categoryId',
      50
    );

  if (categoryId) {
    const normalizedCategoryId =
      normalizeObjectId(
        categoryId,
        'categoryId'
      );

    filters.push({
      'talentPool.categoryId':
        normalizedCategoryId,
    });

    appliedFilters.categoryId =
      normalizedCategoryId;
  }


  const role =
    talentPoolBounded(
      query.role,
      'role'
    );

  if (role) {
    filters.push({
      'talentPool.roles':
        talentPoolExactRegex(
          role
        ),
    });

    appliedFilters.role =
      role;
  }


  const priority =
    talentPoolBounded(
      query.priority,
      'priority',
      20
    );

  if (priority) {
    const normalizedPriority =
      normalizePriority(
        priority
      );

    filters.push({
      'talentPool.priority':
        normalizedPriority,
    });

    appliedFilters.priority =
      normalizedPriority;
  }


  const ownerId =
    talentPoolBounded(
      query.ownerId,
      'ownerId'
    );

  if (ownerId) {
    filters.push({
      'talentPool.ownerId':
        talentPoolExactRegex(
          ownerId
        ),
    });

    appliedFilters.ownerId =
      ownerId;
  }


  const skill =
    talentPoolBounded(
      query.skill,
      'skill'
    );

  if (skill) {
    const regex =
      talentPoolContainsRegex(
        skill
      );

    filters.push({
      $or:
        TALENT_POOL_SKILL_FIELDS
          .map(
            field => ({
              [field]:
                regex,
            })
          ),
    });

    appliedFilters.skill =
      skill;
  }


  const technicalExperienceLevel =
    talentPoolBounded(
      query.technicalExperienceLevel,
      'technicalExperienceLevel'
    );

  if (
    technicalExperienceLevel
  ) {
    filters.push({
      'skills.technicalExperienceLevel':
        talentPoolExactRegex(
          technicalExperienceLevel
        ),
    });

    appliedFilters
      .technicalExperienceLevel =
      technicalExperienceLevel;
  }


  const tag =
    talentPoolBounded(
      query.tag,
      'tag'
    );

  if (tag) {
    filters.push({
      'recruitment.tags':
        talentPoolExactRegex(
          tag
        ),
    });

    appliedFilters.tag =
      tag;
  }


  const exactFields = [
    [
      'country',
      'identity.country',
    ],

    [
      'city',
      'identity.city',
    ],

    [
      'positionTrack',
      'preferences.positionTrack',
    ],

    [
      'positionType',
      'preferences.positionType',
    ],
  ];

  for (
    const [
      parameter,
      path,
    ]
    of exactFields
  ) {
    const value =
      talentPoolBounded(
        query[parameter],
        parameter
      );

    if (value) {
      filters.push({
        [path]:
          talentPoolExactRegex(
            value
          ),
      });

      appliedFilters[
        parameter
      ] =
        value;
    }
  }


  const status =
    talentPoolBounded(
      query.status,
      'status',
      40
    );

  if (status) {
    if (
      !APPLICANT_STATUSES
        .includes(
          status
        )
    ) {
      throw talentPoolSearchError(
        `Unknown applicant status: ${status}`
      );
    }

    filters.push({
      'recruitment.status':
        status,
    });

    appliedFilters.status =
      status;
  }


  const page =
    talentPoolPositiveInt(
      query.page,
      'page',
      1
    );

  const limit =
    talentPoolPositiveInt(
      query.limit,
      'limit',
      50,
      TALENT_POOL_MAX_PAGE_SIZE
    );


  const sortBy =
    talentPoolBounded(
      query.sortBy,
      'sortBy',
      40
    ) ||
    'addedAt';

  if (
    !Object.prototype
      .hasOwnProperty
      .call(
        TALENT_POOL_SORT_FIELDS,
        sortBy
      )
  ) {
    throw talentPoolSearchError(
      `Unsupported sort field: ${sortBy}`
    );
  }


  const sortOrder =
    (
      talentPoolBounded(
        query.sortOrder,
        'sortOrder',
        4
      ) ||
      'desc'
    ).toLowerCase();

  if (
    ![
      'asc',
      'desc',
    ].includes(
      sortOrder
    )
  ) {
    throw talentPoolSearchError(
      'sortOrder must be asc or desc.'
    );
  }


  appliedFilters.sortBy =
    sortBy;

  appliedFilters.sortOrder =
    sortOrder;


  return {
    filter:
      filters.length === 1
        ? filters[0]
        : {
            $and:
              filters,
          },

    page,

    limit,

    skip:
      (page - 1) *
      limit,

    sort: {
      [
        TALENT_POOL_SORT_FIELDS[
          sortBy
        ]
      ]:
        sortOrder ===
        'asc'
          ? 1
          : -1,

      _id:
        sortOrder ===
        'asc'
          ? 1
          : -1,
    },

    appliedFilters,
  };
}


async function listTalentPoolMemberships({
  query = {},

  ApplicantModel =
    Applicant,

  CategoryModel,

  now =
    new Date(),
} = {}) {
  const search =
    buildTalentPoolDiscoveryQuery(
      query,
      {
        now,
      }
    );

  const [
    applicants,
    total,
    categories,
  ] =
    await Promise.all([
      ApplicantModel
        .find(
          search.filter
        )
        .sort(
          search.sort
        )
        .skip(
          search.skip
        )
        .limit(
          search.limit
        )
        .lean(),

      ApplicantModel
        .countDocuments(
          search.filter
        ),

      listTalentPoolCategories({
        includeArchived:
          true,

        CategoryModel,
      }),
    ]);


  const categoryMap =
    new Map(
      (
        categories ||
        []
      ).map(
        category => [
          String(
            category.id
          ),

          category,
        ]
      )
    );


  const talent =
    (
      applicants ||
      []
    ).map(
      applicant => {
        const categoryId =
          applicant
            ?.talentPool
            ?.categoryId
            ? String(
                applicant
                  .talentPool
                  .categoryId
              )
            : '';

        return safeApplicantTalentPoolView(
          applicant,
          {
            category:
              categoryMap.get(
                categoryId
              ) ||
              null,
          }
        );
      }
    );


  return {
    talent,

    pagination: {
      page:
        search.page,

      limit:
        search.limit,

      total,

      pages:
        Math.ceil(
          total /
          search.limit
        ) || 0,
    },

    filters:
      search.appliedFilters,
  };
}


Object.assign(
  module.exports,
  {
    TALENT_POOL_MAX_PAGE_SIZE,
    TALENT_POOL_REVIEW_STATUSES,
    TALENT_POOL_SEARCH_FIELDS,
    TALENT_POOL_SKILL_FIELDS,
    TALENT_POOL_SORT_FIELDS,

    talentPoolSearchError,
    talentPoolSingle,
    talentPoolBounded,
    talentPoolEscapeRegex,
    talentPoolContainsRegex,
    talentPoolExactRegex,
    talentPoolPositiveInt,
    normalizeTalentPoolActiveFilter,
    normalizeTalentPoolReviewStatus,
    buildTalentPoolReviewFilter,
    buildTalentPoolDiscoveryQuery,
    listTalentPoolMemberships,
  }
);


/*
|--------------------------------------------------------------------------
| B5E — Talent Pool Review / Revisit
|--------------------------------------------------------------------------
|
| Review state remains part of the Applicant's Talent Pool membership.
|
| Tasks remain Applicant Internal Tasks.
| Google Calendar synchronization remains explicit.
|
*/


function normalizeTalentPoolReviewDate(
  value,
  {
    required =
      false,

    allowPast =
      false,

    now =
      new Date(),
  } = {}
) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() ===
      ''
  ) {
    if (required) {
      throw serviceError(
        'TALENT_POOL_REVIEW_DATE_REQUIRED',
        'nextReviewAt is required.'
      );
    }

    return null;
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_REVIEW_DATE',
      'nextReviewAt must be a valid date-time.'
    );
  }

  if (
    allowPast !==
      true &&
    date.getTime() <
      new Date(now).getTime()
  ) {
    throw serviceError(
      'TALENT_POOL_REVIEW_DATE_PAST',
      'nextReviewAt cannot be in the past.'
    );
  }

  return date;
}


function normalizeCompleteReviewInput(
  input = {},
  {
    now =
      new Date(),
  } = {}
) {
  if (
    input === null ||
    typeof input !==
      'object' ||
    Array.isArray(input)
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_REVIEW_INPUT',
      'Talent Pool review payload must be an object.'
    );
  }

  const hasNextReviewAt =
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'nextReviewAt'
      );

  return {
    hasNextReviewAt,

    nextReviewAt:
      hasNextReviewAt
        ? normalizeTalentPoolReviewDate(
            input.nextReviewAt,
            {
              required:
                false,

              allowPast:
                false,

              now,
            }
          )
        : null,
  };
}


function normalizeReviewScheduleInput(
  input = {},
  {
    now =
      new Date(),
  } = {}
) {
  if (
    !input ||
    typeof input !==
      'object' ||
    Array.isArray(input)
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_REVIEW_INPUT',
      'Talent Pool review schedule payload must be an object.'
    );
  }

  return {
    nextReviewAt:
      normalizeTalentPoolReviewDate(
        input.nextReviewAt,
        {
          required:
            true,

          allowPast:
            false,

          now,
        }
      ),
  };
}


async function completeTalentPoolReview({
  applicantId,

  input = {},

  actor = {},

  ApplicantModel =
    Applicant,

  CategoryModel,

  now =
    () =>
      new Date(),
} = {}) {
  const applicant =
    await loadTalentPoolApplicant({
      applicantId,
      ApplicantModel,
    });

  assertApplicantAvailable(
    applicant
  );

  assertActiveMembership(
    applicant
  );

  const reviewedAt =
    now();

  const normalized =
    normalizeCompleteReviewInput(
      input,
      {
        now:
          reviewedAt,
      }
    );

  applicant.talentPool
    .lastReviewedAt =
      reviewedAt;

  applicant.talentPool
    .lastReviewedBy =
      actorIdentifier(
        actor
      );

  /*
   * Completing a review closes the current
   * review schedule.
   *
   * A new date may be supplied in the same
   * action to immediately schedule the next
   * review.
   */
  applicant.talentPool
    .nextReviewAt =
      normalized.hasNextReviewAt
        ? normalized.nextReviewAt
        : null;

  await applicant.save();

  const category =
    await resolveTalentPoolCategory(
      applicant,
      {
        CategoryModel,
      }
    );

  return safeApplicantTalentPoolView(
    applicant,
    {
      category,
    }
  );
}


async function scheduleTalentPoolReview({
  applicantId,

  input = {},

  actor = {},

  ApplicantModel =
    Applicant,

  CategoryModel,

  now =
    () =>
      new Date(),
} = {}) {
  const applicant =
    await loadTalentPoolApplicant({
      applicantId,
      ApplicantModel,
    });

  assertApplicantAvailable(
    applicant
  );

  assertActiveMembership(
    applicant
  );

  const currentTime =
    now();

  const normalized =
    normalizeReviewScheduleInput(
      input,
      {
        now:
          currentTime,
      }
    );

  /*
   * Scheduling a revisit is not itself a review.
   *
   * Therefore:
   *   - lastReviewedAt is untouched
   *   - lastReviewedBy is untouched
   *   - no Task is created here
   *   - no Google Calendar write occurs here
   */
  applicant.talentPool
    .nextReviewAt =
      normalized.nextReviewAt;

  /*
   * Accepted now for symmetry and future B5H
   * Audit integration. No Audit event is emitted
   * in B5E.
   */
  void actor;

  await applicant.save();

  const category =
    await resolveTalentPoolCategory(
      applicant,
      {
        CategoryModel,
      }
    );

  return safeApplicantTalentPoolView(
    applicant,
    {
      category,
    }
  );
}


Object.assign(
  module.exports,
  {
    normalizeTalentPoolReviewDate,
    normalizeCompleteReviewInput,
    normalizeReviewScheduleInput,

    completeTalentPoolReview,
    scheduleTalentPoolReview,
  }
);
