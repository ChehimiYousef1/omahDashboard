'use strict';

const assert =
  require('assert');

const Applicant =
  require(
    '../models/Applicant'
  );

const TalentPoolCategory =
  require(
    '../models/TalentPoolCategory'
  );

const {
  DEFAULT_TALENT_POOL_CATEGORIES,
  normalizeCategoryInput,
  assertCategoryId,
} =
  require(
    '../services/applicantTalentPoolCategoryService'
  );

const {
  TALENT_POOL_PRIORITIES,
  normalizeStringList,
  normalizeMembershipInput,
  deriveReviewStatus,
  safeTalentPoolView,
} =
  require(
    '../services/applicantTalentPoolService'
  );


function pathExists(
  schema,
  path
) {
  assert.ok(
    schema.path(path),
    `Missing schema path: ${path}`
  );
}


/*
 * Applicant membership schema.
 */
for (
  const path
  of [
    'talentPool.active',
    'talentPool.categoryId',
    'talentPool.roles',
    'talentPool.priority',
    'talentPool.ownerId',
    'talentPool.source',
    'talentPool.reason',
    'talentPool.addedAt',
    'talentPool.addedBy',
    'talentPool.lastReviewedAt',
    'talentPool.lastReviewedBy',
    'talentPool.nextReviewAt',
    'talentPool.removedAt',
    'talentPool.removedBy',
    'talentPool.removalReason',
    'talentPool.restoredAt',
    'talentPool.restoredBy',
  ]
) {
  pathExists(
    Applicant.schema,
    path
  );
}


assert.deepStrictEqual(
  Applicant.schema
    .path(
      'talentPool.priority'
    )
    .options
    .enum,
  [
    'normal',
    'medium',
    'high',
  ]
);


/*
 * Applicant Talent Pool indexes.
 */
const applicantIndexes =
  Applicant.schema
    .indexes()
    .map(
      ([fields]) =>
        JSON.stringify(
          fields
        )
    );

for (
  const expected
  of [
    {
      'talentPool.active':
        1,

      'talentPool.nextReviewAt':
        1,
    },

    {
      'talentPool.categoryId':
        1,

      'talentPool.active':
        1,
    },

    {
      'talentPool.roles':
        1,

      'talentPool.active':
        1,
    },

    {
      'talentPool.priority':
        1,

      'talentPool.active':
        1,
    },

    {
      'talentPool.ownerId':
        1,

      'talentPool.active':
        1,
    },
  ]
) {
  assert.ok(
    applicantIndexes.includes(
      JSON.stringify(
        expected
      )
    ),
    `Missing Talent Pool index: ${JSON.stringify(expected)}`
  );
}


/*
 * Configurable category model.
 */
for (
  const path
  of [
    'name',
    'slug',
    'description',
    'active',
    'sortOrder',
    'createdBy',
    'updatedBy',
    'archivedAt',
    'archivedBy',
    'createdAt',
    'updatedAt',
  ]
) {
  pathExists(
    TalentPoolCategory.schema,
    path
  );
}


const categoryIndexes =
  TalentPoolCategory
    .schema
    .indexes();

assert.ok(
  categoryIndexes.some(
    ([fields, options]) =>
      fields.slug ===
        1 &&
      options.unique ===
        true
  ),
  'Talent Pool category slug must be unique'
);


/*
 * Initial categories.
 */
assert.strictEqual(
  DEFAULT_TALENT_POOL_CATEGORIES
    .length,
  9
);

const defaultSlugs =
  DEFAULT_TALENT_POOL_CATEGORIES
    .map(
      category =>
        category.slug
    );

assert.strictEqual(
  new Set(
    defaultSlugs
  ).size,
  defaultSlugs.length
);

assert.ok(
  defaultSlugs.includes(
    'strong-candidate'
  )
);

assert.ok(
  defaultSlugs.includes(
    'future-opportunity'
  )
);

assert.ok(
  defaultSlugs.includes(
    'reconsider-later'
  )
);


/*
 * Category normalization.
 */
assert.deepStrictEqual(
  normalizeCategoryInput({
    name:
      '  Data Talent  ',

    description:
      ' Future analytics candidates ',

    sortOrder:
      25,
  }),
  {
    name:
      'Data Talent',

    slug:
      'data-talent',

    description:
      'Future analytics candidates',

    sortOrder:
      25,
  }
);


assert.throws(
  () =>
    normalizeCategoryInput({
      name:
        'Test',

      active:
        false,
    }),
  error =>
    error.code ===
      'INVALID_TALENT_POOL_CATEGORY'
);


/*
 * Category ObjectId validation.
 */
const validObjectId =
  '64b64c000000000000000002';

assert.strictEqual(
  assertCategoryId(
    validObjectId
  ),
  validObjectId
);

assert.throws(
  () =>
    assertCategoryId(
      'not-an-id'
    ),
  error =>
    error.code ===
      'INVALID_TALENT_POOL_CATEGORY_ID'
);


/*
 * Membership normalization.
 */
assert.deepStrictEqual(
  TALENT_POOL_PRIORITIES,
  [
    'normal',
    'medium',
    'high',
  ]
);


assert.deepStrictEqual(
  normalizeStringList(
    [
      ' React ',
      'react',
      '.NET',
      '',
    ],
    {
      fieldName:
        'roles',
    }
  ),
  [
    'React',
    '.NET',
  ]
);


const membership =
  normalizeMembershipInput({
    categoryId:
      validObjectId,

    roles: [
      'Full-Stack Development',
      'full-stack development',
      '.NET Development',
    ],

    priority:
      'HIGH',

    ownerId:
      ' recruiter-123 ',

    source:
      ' evaluation ',

    reason:
      ' Strong future fit ',

    nextReviewAt:
      '2026-11-15T09:00:00.000Z',
  });


assert.strictEqual(
  membership.categoryId,
  validObjectId
);

assert.deepStrictEqual(
  membership.roles,
  [
    'Full-Stack Development',
    '.NET Development',
  ]
);

assert.strictEqual(
  membership.priority,
  'high'
);

assert.strictEqual(
  membership.ownerId,
  'recruiter-123'
);

assert.strictEqual(
  membership.source,
  'evaluation'
);

assert.strictEqual(
  membership.reason,
  'Strong future fit'
);

assert.ok(
  membership.nextReviewAt
    instanceof Date
);


assert.throws(
  () =>
    normalizeMembershipInput({
      categoryId:
        validObjectId,

      password:
        'must-never-be-accepted',
    }),
  error =>
    error.code ===
      'INVALID_TALENT_POOL_INPUT'
);


assert.deepStrictEqual(
  normalizeMembershipInput(
    {
      priority:
        'medium',
    },
    {
      partial:
        true,
    }
  ),
  {
    priority:
      'medium',
  }
);


/*
 * Derived revisit state.
 */
const now =
  new Date(
    2026,
    8,
    23,
    12,
    0,
    0,
    0
  );

assert.strictEqual(
  deriveReviewStatus(
    {
      active:
        false,
    },
    {
      now,
    }
  ),
  'inactive'
);

assert.strictEqual(
  deriveReviewStatus(
    {
      active:
        true,
    },
    {
      now,
    }
  ),
  'not_scheduled'
);

assert.strictEqual(
  deriveReviewStatus(
    {
      active:
        true,

      lastReviewedAt:
        new Date(
          2026,
          8,
          20
        ),
    },
    {
      now,
    }
  ),
  'reviewed'
);

assert.strictEqual(
  deriveReviewStatus(
    {
      active:
        true,

      nextReviewAt:
        new Date(
          2026,
          8,
          22,
          16
        ),
    },
    {
      now,
    }
  ),
  'overdue'
);

assert.strictEqual(
  deriveReviewStatus(
    {
      active:
        true,

      nextReviewAt:
        new Date(
          2026,
          8,
          23,
          18
        ),
    },
    {
      now,
    }
  ),
  'due'
);

assert.strictEqual(
  deriveReviewStatus(
    {
      active:
        true,

      nextReviewAt:
        new Date(
          2026,
          8,
          25,
          9
        ),
    },
    {
      now,
    }
  ),
  'scheduled'
);


/*
 * Safe Talent Pool view.
 */
const safe =
  safeTalentPoolView({
    talentPool: {
      active:
        true,

      categoryId:
        validObjectId,

      roles: [
        'Full-Stack Development',
      ],

      priority:
        'high',

      ownerId:
        'recruiter-123',

      reason:
        'Internal reason',

      nextReviewAt:
        new Date(
          2099,
          0,
          1
        ),

      removalReason:
        'Private removal reason',
    },

    identity: {
      normalizedEmail:
        'private@example.com',
    },

    password:
      'private',
  });


assert.strictEqual(
  safe.active,
  true
);

assert.strictEqual(
  safe.priority,
  'high'
);

assert.strictEqual(
  Object.prototype
    .hasOwnProperty
    .call(
      safe,
      'removalReason'
    ),
  false
);

assert.strictEqual(
  JSON.stringify(safe)
    .includes(
      'private@example.com'
    ),
  false
);

assert.strictEqual(
  JSON.stringify(safe)
    .includes(
      '"password"'
    ),
  false
);


console.log(
  '✅ Applicant Talent Pool membership schema'
);

console.log(
  '✅ Talent Pool query indexes'
);

console.log(
  '✅ configurable TalentPoolCategory model'
);

console.log(
  '✅ unique category slug'
);

console.log(
  '✅ 9 initial Talent Pool categories'
);

console.log(
  '✅ category payload normalization'
);

console.log(
  '✅ membership payload normalization'
);

console.log(
  '✅ role de-duplication'
);

console.log(
  '✅ priority validation'
);

console.log(
  '✅ server-derived review status'
);

console.log(
  '✅ Talent Pool safe-view boundary'
);

console.log(
  '✅ no database connection used'
);

console.log(
  '\nAPPLICANT TALENT POOL FOUNDATION TEST PASSED'
);
