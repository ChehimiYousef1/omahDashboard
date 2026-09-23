'use strict';

const assert =
  require('assert');

const {
  getTalentPoolMembership,
  addTalentPoolMembership,
  replaceTalentPoolMembership,
  patchTalentPoolMembership,
  removeTalentPoolMembership,
  restoreTalentPoolMembership,
} =
  require(
    '../services/applicantTalentPoolService'
  );


const APPLICANT_ID =
  '64b64c000000000000000001';

const CATEGORY_ID =
  '64b64c000000000000000002';


function makeApplicant(
  overrides = {}
) {
  return {
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

      institutionCountry:
        'Lebanon',

      degreeLevel:
        'Bachelor',

      major:
        'Computer Science',

      specialization:
        'Software Engineering',
    },

    preferences: {
      positionTrack:
        'Full-Stack Development',

      positionType:
        'Remote',

      availableStartDate:
        null,

      weeklyAvailability:
        '40 hours',
    },

    skills: {
      primaryTechnical: [
        'React',
        '.NET',
      ],

      technicalExperienceLevel:
        'Intermediate',

      programmingLanguages: [
        'C#',
        'JavaScript',
      ],

      frameworks: [
        'ASP.NET Core',
        'React',
      ],

      databases: [
        'SQL Server',
      ],

      cloudDevOps: [
        'AWS',
      ],

      developmentTools: [
        'Git',
      ],

      dataEngineerSkills:
        [],

      aiMlEngineerSkills:
        [],

      dataAnalystSkills:
        [],
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
        false,

      categoryId:
        null,

      roles:
        [],

      priority:
        'normal',

      ownerId:
        '',

      source:
        'manual',

      reason:
        '',

      addedAt:
        null,

      addedBy:
        '',

      lastReviewedAt:
        null,

      lastReviewedBy:
        '',

      nextReviewAt:
        null,

      removedAt:
        null,

      removedBy:
        '',

      removalReason:
        '',

      restoredAt:
        null,

      restoredBy:
        '',
    },

    async save() {
      return this;
    },

    ...overrides,
  };
}


function applicantModelFor(
  applicant
) {
  return {
    async findById(
      id
    ) {
      assert.strictEqual(
        id,
        APPLICANT_ID
      );

      return applicant;
    },
  };
}


function categoryModel({
  active =
    true,
} = {}) {
  return {
    findById(
      id
    ) {
      assert.strictEqual(
        String(id),
        CATEGORY_ID
      );

      return {
        async lean() {
          return {
            _id:
              CATEGORY_ID,

            name:
              'Strong Candidate',

            slug:
              'strong-candidate',

            description:
              '',

            active,

            sortOrder:
              10,

            createdBy:
              'admin',

            updatedBy:
              'admin',
          };
        },
      };
    },
  };
}


async function run() {
  const applicant =
    makeApplicant();

  const ApplicantModel =
    applicantModelFor(
      applicant
    );

  const CategoryModel =
    categoryModel();


  const added =
    await addTalentPoolMembership({
      applicantId:
        APPLICANT_ID,

      input: {
        categoryId:
          CATEGORY_ID,

        roles: [
          'Full-Stack Development',
          '.NET Development',
        ],

        priority:
          'high',

        ownerId:
          'recruiter-1',

        source:
          'evaluation',

        reason:
          'Strong future fit',

        nextReviewAt:
          '2026-11-15T09:00:00.000Z',
      },

      actor: {
        id:
          'admin-1',
      },

      ApplicantModel,
      CategoryModel,

      now:
        () =>
          new Date(
            '2026-09-23T10:00:00.000Z'
          ),
    });

  assert.strictEqual(
    added.talentPool.active,
    true
  );

  assert.strictEqual(
    added.talentPool.priority,
    'high'
  );

  assert.strictEqual(
    added.talentPool.addedBy,
    'admin-1'
  );

  assert.strictEqual(
    added.category.slug,
    'strong-candidate'
  );


  await assert.rejects(
    () =>
      addTalentPoolMembership({
        applicantId:
          APPLICANT_ID,

        input: {
          categoryId:
            CATEGORY_ID,
        },

        ApplicantModel,
        CategoryModel,
      }),

    error =>
      error.code ===
      'TALENT_POOL_MEMBERSHIP_CONFLICT'
  );


  const patched =
    await patchTalentPoolMembership({
      applicantId:
        APPLICANT_ID,

      input: {
        priority:
          'medium',

        roles: [
          'Full-Stack Development',
          'React Development',
        ],
      },

      ApplicantModel,
      CategoryModel,
    });

  assert.strictEqual(
    patched.talentPool.priority,
    'medium'
  );

  assert.deepStrictEqual(
    patched.talentPool.roles,
    [
      'Full-Stack Development',
      'React Development',
    ]
  );


  const replaced =
    await replaceTalentPoolMembership({
      applicantId:
        APPLICANT_ID,

      input: {
        categoryId:
          CATEGORY_ID,

        roles: [
          'Software Development',
        ],

        priority:
          'normal',

        ownerId:
          'recruiter-2',

        source:
          'manual',

        reason:
          'Future project',

        nextReviewAt:
          null,
      },

      ApplicantModel,
      CategoryModel,
    });

  assert.strictEqual(
    replaced.talentPool.ownerId,
    'recruiter-2'
  );

  assert.deepStrictEqual(
    replaced.talentPool.roles,
    [
      'Software Development',
    ]
  );


  const removed =
    await removeTalentPoolMembership({
      applicantId:
        APPLICANT_ID,

      reason:
        'No current opening',

      actor: {
        id:
          'admin-2',
      },

      ApplicantModel,
      CategoryModel,

      now:
        () =>
          new Date(
            '2026-09-24T10:00:00.000Z'
          ),
    });

  assert.strictEqual(
    removed.talentPool.active,
    false
  );

  assert.strictEqual(
    removed.talentPool.removedBy,
    'admin-2'
  );

  assert.strictEqual(
    removed.talentPool.nextReviewAt,
    null
  );


  await assert.rejects(
    () =>
      patchTalentPoolMembership({
        applicantId:
          APPLICANT_ID,

        input: {
          priority:
            'high',
        },

        ApplicantModel,
        CategoryModel,
      }),

    error =>
      error.code ===
      'TALENT_POOL_MEMBERSHIP_CONFLICT'
  );


  const restored =
    await restoreTalentPoolMembership({
      applicantId:
        APPLICANT_ID,

      actor: {
        id:
          'admin-3',
      },

      ApplicantModel,
      CategoryModel,

      now:
        () =>
          new Date(
            '2026-09-25T10:00:00.000Z'
          ),
    });

  assert.strictEqual(
    restored.talentPool.active,
    true
  );

  assert.strictEqual(
    restored.talentPool.restoredBy,
    'admin-3'
  );


  const fetched =
    await getTalentPoolMembership({
      applicantId:
        APPLICANT_ID,

      ApplicantModel,
      CategoryModel,
    });

  assert.strictEqual(
    fetched.id,
    APPLICANT_ID
  );

  assert.strictEqual(
    fetched.identity.fullName,
    'Candidate Example'
  );

  assert.strictEqual(
    fetched.category.slug,
    'strong-candidate'
  );

  assert.deepStrictEqual(
    fetched.recruitment.tags,
    [
      'high-potential',
    ]
  );


  const json =
    JSON.stringify(
      fetched
    );

  for (
    const forbidden
    of [
      'normalizedEmail',
      'normalizedPhone',
      'whatsappNumber',
      'linkedinCanonical',
      'storageKey',
      'checksum',
      'password',
    ]
  ) {
    assert.strictEqual(
      json.includes(
        forbidden
      ),
      false,
      `Private field leaked: ${forbidden}`
    );
  }


  const archivedApplicant =
    makeApplicant({
      lifecycle: {
        archived:
          true,
      },
    });

  await assert.rejects(
    () =>
      addTalentPoolMembership({
        applicantId:
          APPLICANT_ID,

        input: {
          categoryId:
            CATEGORY_ID,
        },

        ApplicantModel:
          applicantModelFor(
            archivedApplicant
          ),

        CategoryModel,
      }),

    error =>
      error.code ===
      'APPLICANT_ARCHIVED'
  );


  const freshApplicant =
    makeApplicant();

  await assert.rejects(
    () =>
      addTalentPoolMembership({
        applicantId:
          APPLICANT_ID,

        input: {
          categoryId:
            CATEGORY_ID,
        },

        ApplicantModel:
          applicantModelFor(
            freshApplicant
          ),

        CategoryModel:
          categoryModel({
            active:
              false,
          }),
      }),

    error =>
      error.code ===
      'INVALID_TALENT_POOL_CATEGORY'
  );


  console.log(
    '✅ GET membership by Applicant ID'
  );

  console.log(
    '✅ POST add membership'
  );

  console.log(
    '✅ duplicate membership protection'
  );

  console.log(
    '✅ PUT full membership update'
  );

  console.log(
    '✅ PATCH partial membership edit'
  );

  console.log(
    '✅ DELETE soft membership removal'
  );

  console.log(
    '✅ inactive membership edit protection'
  );

  console.log(
    '✅ POST membership restore'
  );

  console.log(
    '✅ archived Applicant mutation protection'
  );

  console.log(
    '✅ archived category protection'
  );

  console.log(
    '✅ Applicant tags reused'
  );

  console.log(
    '✅ private/normalized fields excluded'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nAPPLICANT TALENT POOL MEMBERSHIP LIFECYCLE TEST PASSED'
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
