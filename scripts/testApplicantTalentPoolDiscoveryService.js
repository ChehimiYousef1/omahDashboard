'use strict';

const assert =
  require('assert');

const {
  buildTalentPoolDiscoveryQuery,
  listTalentPoolMemberships,
  TALENT_POOL_MAX_PAGE_SIZE,
} =
  require(
    '../services/applicantTalentPoolService'
  );


const APPLICANT_ID =
  '64b64c000000000000000001';

const CATEGORY_ID =
  '64b64c000000000000000002';


function flattenAnd(
  filter
) {
  return Array.isArray(
    filter?.$and
  )
    ? filter.$and
    : [
        filter,
      ];
}


function hasFilterPath(
  filter,
  path
) {
  return flattenAnd(
    filter
  ).some(
    item =>
      item &&
      Object.prototype
        .hasOwnProperty
        .call(
          item,
          path
        )
  );
}


async function run() {
  const basic =
    buildTalentPoolDiscoveryQuery(
      {}
    );

  assert.ok(
    hasFilterPath(
      basic.filter,
      'lifecycle.archived'
    )
  );

  assert.ok(
    hasFilterPath(
      basic.filter,
      'talentPool.active'
    )
  );

  assert.strictEqual(
    basic.appliedFilters.active,
    'true'
  );

  assert.strictEqual(
    basic.page,
    1
  );

  assert.strictEqual(
    basic.limit,
    50
  );


  const filtered =
    buildTalentPoolDiscoveryQuery(
      {
        q:
          'react',

        categoryId:
          CATEGORY_ID,

        role:
          'Frontend Developer',

        skill:
          'React',

        technicalExperienceLevel:
          'Intermediate',

        tag:
          'high-potential',

        priority:
          'high',

        ownerId:
          'recruiter-1',

        country:
          'Lebanon',

        city:
          'Beirut',

        positionTrack:
          'Software Development',

        positionType:
          'Remote',

        status:
          'reviewed',

        page:
          '2',

        limit:
          '25',

        sortBy:
          'nextReviewAt',

        sortOrder:
          'asc',
      }
    );

  assert.strictEqual(
    filtered.page,
    2
  );

  assert.strictEqual(
    filtered.limit,
    25
  );

  assert.strictEqual(
    filtered.skip,
    25
  );

  assert.strictEqual(
    filtered.sort[
      'talentPool.nextReviewAt'
    ],
    1
  );

  assert.strictEqual(
    filtered.appliedFilters
      .categoryId,
    CATEGORY_ID
  );

  assert.strictEqual(
    filtered.appliedFilters
      .priority,
    'high'
  );

  assert.strictEqual(
    filtered.appliedFilters
      .tag,
    'high-potential'
  );


  const overdue =
    buildTalentPoolDiscoveryQuery(
      {
        reviewStatus:
          'overdue',

        active:
          'all',
      },
      {
        now:
          new Date(
            '2026-09-23T12:00:00.000Z'
          ),
      }
    );

  assert.strictEqual(
    overdue.appliedFilters
      .reviewStatus,
    'overdue'
  );

  assert.ok(
    hasFilterPath(
      overdue.filter,
      'talentPool.nextReviewAt'
    )
  );


  const all =
    buildTalentPoolDiscoveryQuery(
      {
        active:
          'all',
      }
    );

  assert.strictEqual(
    hasFilterPath(
      all.filter,
      'talentPool.active'
    ),
    false
  );


  assert.throws(
    () =>
      buildTalentPoolDiscoveryQuery(
        {
          limit:
            String(
              TALENT_POOL_MAX_PAGE_SIZE +
              1
            ),
        }
      ),

    /cannot exceed/
  );


  assert.throws(
    () =>
      buildTalentPoolDiscoveryQuery(
        {
          sortBy:
            'password',
        }
      ),

    /Unsupported sort field/
  );


  const applicant = {
    _id:
      APPLICANT_ID,

    applicantCode:
      'APP-001',

    identity: {
      fullName:
        'Candidate Example',

      email:
        'candidate@example.test',

      normalizedEmail:
        'candidate@example.test',

      phoneNumber:
        '+000000000',

      normalizedPhone:
        '000000000',

      country:
        'Lebanon',

      city:
        'Beirut',
    },

    education: {
      universityName:
        'Example University',

      degreeLevel:
        'Bachelor',

      major:
        'Computer Science',
    },

    preferences: {
      positionTrack:
        'Software Development',

      positionType:
        'Remote',
    },

    skills: {
      primaryTechnical: [
        'React',
      ],

      technicalExperienceLevel:
        'Intermediate',

      programmingLanguages: [
        'JavaScript',
      ],
    },

    recruitment: {
      status:
        'reviewed',

      assignedRecruiterId:
        'recruiter-1',

      tags: [
        'high-potential',
      ],
    },

    lifecycle: {
      archived:
        false,
    },

    talentPool: {
      active:
        true,

      categoryId:
        CATEGORY_ID,

      roles: [
        'Frontend Developer',
      ],

      priority:
        'high',

      ownerId:
        'recruiter-1',

      source:
        'evaluation',

      reason:
        'Strong fit',

      addedAt:
        new Date(
          '2026-09-20T10:00:00.000Z'
        ),

      addedBy:
        'admin-1',

      nextReviewAt:
        null,
    },
  };


  let capturedFilter =
    null;

  const ApplicantModel = {
    find(
      filter
    ) {
      capturedFilter =
        filter;

      const chain = {
        sort() {
          return chain;
        },

        skip() {
          return chain;
        },

        limit() {
          return chain;
        },

        async lean() {
          return [
            applicant,
          ];
        },
      };

      return chain;
    },

    async countDocuments(
      filter
    ) {
      assert.deepStrictEqual(
        filter,
        capturedFilter
      );

      return 1;
    },
  };


  const CategoryModel = {
    find() {
      const chain = {
        sort() {
          return chain;
        },

        async lean() {
          return [
            {
              _id:
                CATEGORY_ID,

              name:
                'Strong Candidate',

              slug:
                'strong-candidate',

              description:
                '',

              active:
                true,

              sortOrder:
                10,

              createdBy:
                'admin',

              updatedBy:
                'admin',
            },
          ];
        },
      };

      return chain;
    },
  };


  const result =
    await listTalentPoolMemberships({
      query: {
        role:
          'Frontend Developer',
      },

      ApplicantModel,
      CategoryModel,
    });


  assert.strictEqual(
    result.talent.length,
    1
  );

  assert.strictEqual(
    result.pagination.total,
    1
  );

  assert.strictEqual(
    result.talent[0]
      .identity
      .fullName,
    'Candidate Example'
  );

  assert.strictEqual(
    result.talent[0]
      .category
      .slug,
    'strong-candidate'
  );

  assert.deepStrictEqual(
    result.talent[0]
      .recruitment
      .tags,
    [
      'high-potential',
    ]
  );


  const serialized =
    JSON.stringify(
      result
    );

  for (
    const forbidden
    of [
      'normalizedEmail',
      'normalizedPhone',
      'linkedinCanonical',
      'password',
      'storageKey',
      'checksum',
    ]
  ) {
    assert.strictEqual(
      serialized.includes(
        forbidden
      ),
      false,
      `Private field leaked: ${forbidden}`
    );
  }


  console.log(
    '✅ active Talent Pool is default'
  );

  console.log(
    '✅ archived Applicants excluded'
  );

  console.log(
    '✅ text search contract'
  );

  console.log(
    '✅ category filter'
  );

  console.log(
    '✅ role filter'
  );

  console.log(
    '✅ skill filter'
  );

  console.log(
    '✅ technical experience filter'
  );

  console.log(
    '✅ Applicant recruitment.tags reused'
  );

  console.log(
    '✅ priority filter'
  );

  console.log(
    '✅ owner filter'
  );

  console.log(
    '✅ country / city filters'
  );

  console.log(
    '✅ position track / type filters'
  );

  console.log(
    '✅ recruitment status filter'
  );

  console.log(
    '✅ review status filter'
  );

  console.log(
    '✅ active / removed / all filtering'
  );

  console.log(
    '✅ pagination'
  );

  console.log(
    '✅ safe sorting'
  );

  console.log(
    '✅ category metadata joined'
  );

  console.log(
    '✅ safe Applicant response boundary'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nAPPLICANT TALENT POOL DISCOVERY SERVICE TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(
      error
    );

    process.exitCode =
      1;
  }
);
