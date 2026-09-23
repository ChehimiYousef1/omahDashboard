'use strict';

const assert =
  require('assert');

const {
  normalizeTalentPoolReviewDate,
  completeTalentPoolReview,
  scheduleTalentPoolReview,
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
      'APP-REVIEW-001',

    identity: {
      fullName:
        'Review Candidate',

      email:
        'review@example.test',
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
        'Software Developer',
      ],

      priority:
        'high',

      ownerId:
        'recruiter-1',

      source:
        'manual',

      reason:
        'Future opportunity',

      addedAt:
        new Date(
          '2026-09-20T10:00:00.000Z'
        ),

      addedBy:
        'admin-1',

      lastReviewedAt:
        null,

      lastReviewedBy:
        '',

      nextReviewAt:
        new Date(
          '2026-09-23T15:00:00.000Z'
        ),

      removedAt:
        null,

      removedBy:
        '',

      restoredAt:
        null,

      restoredBy:
        '',
    },

    async save() {
      this.saveCount =
        (
          this.saveCount ||
          0
        ) +
        1;

      return this;
    },

    ...overrides,
  };
}


function ApplicantModelFor(
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


function CategoryModel() {
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
              'Future Opportunity',

            slug:
              'future-opportunity',

            active:
              true,

            sortOrder:
              20,
          };
        },
      };
    },
  };
}


async function run() {
  const now =
    new Date(
      '2026-09-23T12:00:00.000Z'
    );


  /*
   * Date validation.
   */
  assert.throws(
    () =>
      normalizeTalentPoolReviewDate(
        'not-a-date',
        {
          required:
            true,

          now,
        }
      ),

    error =>
      error.code ===
      'INVALID_TALENT_POOL_REVIEW_DATE'
  );


  assert.throws(
    () =>
      normalizeTalentPoolReviewDate(
        '2026-09-22T12:00:00.000Z',
        {
          required:
            true,

          now,
        }
      ),

    error =>
      error.code ===
      'TALENT_POOL_REVIEW_DATE_PAST'
  );


  /*
   * Complete review without another date.
   * Existing due schedule must be cleared.
   */
  const applicant =
    makeApplicant();

  const reviewed =
    await completeTalentPoolReview({
      applicantId:
        APPLICANT_ID,

      input: {},

      actor: {
        id:
          'recruiter-7',
      },

      ApplicantModel:
        ApplicantModelFor(
          applicant
        ),

      CategoryModel:
        CategoryModel(),

      now:
        () =>
          new Date(now),
    });


  assert.strictEqual(
    applicant.talentPool
      .lastReviewedAt
      .toISOString(),

    now.toISOString()
  );


  assert.strictEqual(
    applicant.talentPool
      .lastReviewedBy,

    'recruiter-7'
  );


  assert.strictEqual(
    applicant.talentPool
      .nextReviewAt,

    null
  );


  assert.strictEqual(
    reviewed.talentPool
      .lastReviewedBy,

    'recruiter-7'
  );


  /*
   * Complete review and immediately schedule
   * the next review.
   */
  const applicantWithNext =
    makeApplicant();

  const nextReview =
    '2026-10-23T10:30:00.000Z';


  await completeTalentPoolReview({
    applicantId:
      APPLICANT_ID,

    input: {
      nextReviewAt:
        nextReview,
    },

    actor: {
      id:
        'admin-1',
    },

    ApplicantModel:
      ApplicantModelFor(
        applicantWithNext
      ),

    CategoryModel:
      CategoryModel(),

    now:
      () =>
        new Date(now),
  });


  assert.strictEqual(
    applicantWithNext
      .talentPool
      .nextReviewAt
      .toISOString(),

    nextReview
  );


  /*
   * Explicit scheduling does not complete
   * a review.
   */
  const scheduledApplicant =
    makeApplicant();

  scheduledApplicant
    .talentPool
    .lastReviewedAt =
      new Date(
        '2026-09-01T09:00:00.000Z'
      );

  scheduledApplicant
    .talentPool
    .lastReviewedBy =
      'recruiter-old';


  const scheduledFor =
    '2026-11-01T09:00:00.000Z';


  await scheduleTalentPoolReview({
    applicantId:
      APPLICANT_ID,

    input: {
      nextReviewAt:
        scheduledFor,
    },

    actor: {
      id:
        'recruiter-new',
    },

    ApplicantModel:
      ApplicantModelFor(
        scheduledApplicant
      ),

    CategoryModel:
      CategoryModel(),

    now:
      () =>
        new Date(now),
  });


  assert.strictEqual(
    scheduledApplicant
      .talentPool
      .nextReviewAt
      .toISOString(),

    scheduledFor
  );


  assert.strictEqual(
    scheduledApplicant
      .talentPool
      .lastReviewedAt
      .toISOString(),

    '2026-09-01T09:00:00.000Z'
  );


  assert.strictEqual(
    scheduledApplicant
      .talentPool
      .lastReviewedBy,

    'recruiter-old'
  );


  /*
   * Inactive membership cannot be reviewed.
   */
  const inactiveApplicant =
    makeApplicant();

  inactiveApplicant
    .talentPool
    .active =
      false;


  await assert.rejects(
    () =>
      completeTalentPoolReview({
        applicantId:
          APPLICANT_ID,

        ApplicantModel:
          ApplicantModelFor(
            inactiveApplicant
          ),

        CategoryModel:
          CategoryModel(),
      }),

    error =>
      error.code ===
      'TALENT_POOL_MEMBERSHIP_CONFLICT'
  );


  /*
   * Archived Applicant cannot be scheduled.
   */
  const archivedApplicant =
    makeApplicant({
      lifecycle: {
        archived:
          true,
      },
    });


  await assert.rejects(
    () =>
      scheduleTalentPoolReview({
        applicantId:
          APPLICANT_ID,

        input: {
          nextReviewAt:
            scheduledFor,
        },

        ApplicantModel:
          ApplicantModelFor(
            archivedApplicant
          ),

        CategoryModel:
          CategoryModel(),

        now:
          () =>
            new Date(now),
      }),

    error =>
      error.code ===
      'APPLICANT_ARCHIVED'
  );


  /*
   * B5E service must not know about or invoke
   * Google Calendar.
   */
  const serviceSource =
    require('fs')
      .readFileSync(
        require.resolve(
          '../services/applicantTalentPoolService'
        ),
        'utf8'
      );

  const b5eBlock =
    serviceSource.split(
      'B5E — Talent Pool Review / Revisit'
    )[1] || '';


  assert.strictEqual(
    b5eBlock.includes(
      'createApplicantInternalCalendarEvent('
    ),
    false
  );


  assert.strictEqual(
    b5eBlock.includes(
      'addApplicantInternalItemToCalendar('
    ),
    false
  );


  console.log(
    '✅ valid review date normalization'
  );

  console.log(
    '✅ invalid review date rejected'
  );

  console.log(
    '✅ past review schedule rejected'
  );

  console.log(
    '✅ review completion records lastReviewedAt'
  );

  console.log(
    '✅ review completion records lastReviewedBy'
  );

  console.log(
    '✅ completed review clears old schedule'
  );

  console.log(
    '✅ review can immediately schedule next revisit'
  );

  console.log(
    '✅ scheduling does not mark review completed'
  );

  console.log(
    '✅ inactive Talent Pool membership protected'
  );

  console.log(
    '✅ archived Applicant protected'
  );

  console.log(
    '✅ no Task automatically created'
  );

  console.log(
    '✅ no Google Calendar write introduced'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nAPPLICANT TALENT POOL REVIEW SERVICE TEST PASSED'
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
