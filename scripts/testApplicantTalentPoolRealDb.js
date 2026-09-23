'use strict';

require('dotenv').config();

const mongoose =
  require('mongoose');

const Applicant =
  require(
    '../models/Applicant'
  );

const TalentPoolCategory =
  require(
    '../models/TalentPoolCategory'
  );

const ApplicantActivity =
  require(
    '../models/ApplicantActivity'
  );

const talentPool =
  require(
    '../services/applicantTalentPoolService'
  );

const {
  recordApplicantActivity,
} =
  require(
    '../services/applicantActivityService'
  );


function chooseFunction(
  exactNames,
  regexes
) {
  for (
    const name
    of exactNames
  ) {
    if (
      typeof talentPool[
        name
      ] ===
      'function'
    ) {
      return talentPool[
        name
      ];
    }
  }

  for (
    const [
      key,
      value,
    ]
    of Object.entries(
      talentPool
    )
  ) {
    if (
      typeof value !==
      'function'
    ) {
      continue;
    }

    if (
      regexes.some(
        pattern =>
          pattern.test(
            key
          )
      )
    ) {
      return value;
    }
  }

  return null;
}


const addMembership =
  chooseFunction(
    [
      'addApplicantToTalentPool',
      'addTalentPoolMembership',
      'createTalentPoolMembership',
    ],
    [
      /^add.*talent.*pool/i,
      /^create.*talent.*membership/i,
    ]
  );


const patchMembership =
  chooseFunction(
    [
      'patchApplicantTalentPoolMembership',
      'patchTalentPoolMembership',
      'updateTalentPoolMembership',
    ],
    [
      /^patch.*talent.*pool/i,
      /^update.*talent.*membership/i,
    ]
  );


const removeMembership =
  chooseFunction(
    [
      'removeApplicantFromTalentPool',
      'removeTalentPoolMembership',
    ],
    [
      /^remove.*talent.*pool/i,
    ]
  );


const restoreMembership =
  chooseFunction(
    [
      'restoreApplicantToTalentPool',
      'restoreTalentPoolMembership',
    ],
    [
      /^restore.*talent.*pool/i,
    ]
  );


const completeReview =
  chooseFunction(
    [
      'completeApplicantTalentPoolReview',
      'completeTalentPoolReview',
    ],
    [
      /^complete.*talent.*review/i,
      /^review.*talent.*pool/i,
    ]
  );


const scheduleReview =
  chooseFunction(
    [
      'scheduleApplicantTalentPoolReview',
      'scheduleTalentPoolReview',
    ],
    [
      /^schedule.*talent.*review/i,
    ]
  );


function requireFunction(
  value,
  label
) {
  if (
    typeof value !==
      'function'
  ) {
    throw new Error(
      `Required real-DB service function missing: ${label}`
    );
  }

  return value;
}


function clone(
  value
) {
  return value === undefined
    ? undefined
    : JSON.parse(
        JSON.stringify(
          value
        )
      );
}


async function invoke(
  fn,
  {
    applicantId,
    input,
    actor,
    reason,
  } = {}
) {
  return fn({
    applicantId,
    id:
      applicantId,

    input,
    changes:
      input,
    payload:
      input,

    actor,
    user:
      actor,

    reason:
      reason ||
      input
        ?.reason,

    nextReviewAt:
      input
        ?.nextReviewAt,

    ApplicantModel:
      Applicant,

    CategoryModel:
      TalentPoolCategory,
  });
}


async function main() {
  if (
    process.env
      .B5J_REAL_DB_CONFIRM !==
    'LOCAL-OMAH'
  ) {
    throw new Error(
      'Set B5J_REAL_DB_CONFIRM=LOCAL-OMAH to run reversible real DB validation.'
    );
  }

  if (
    process.env.NODE_ENV ===
    'production'
  ) {
    throw new Error(
      'Real DB smoke test refuses NODE_ENV=production.'
    );
  }

  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    process.env.DB_URI;

  if (!uri) {
    throw new Error(
      'No MongoDB URI found in local environment.'
    );
  }

  await mongoose.connect(
    uri
  );

  const databaseName =
    mongoose.connection
      .name ||
    '';

  if (
    /prod/i.test(
      databaseName
    )
  ) {
    throw new Error(
      `Refusing production-like database name: ${databaseName}`
    );
  }

  console.log(
    `✅ Connected to local database: ${databaseName}`
  );

  requireFunction(
    addMembership,
    'add membership'
  );

  requireFunction(
    patchMembership,
    'patch membership'
  );

  requireFunction(
    removeMembership,
    'remove membership'
  );

  requireFunction(
    restoreMembership,
    'restore membership'
  );

  requireFunction(
    completeReview,
    'complete review'
  );

  requireFunction(
    scheduleReview,
    'schedule review'
  );

  const applicant =
    await Applicant
      .findOne({
        'lifecycle.archived': {
          $ne: true,
        },

        'talentPool.addedAt': {
          $exists: false,
        },
      })
      .select(
        '_id talentPool'
      )
      .lean();

  if (!applicant) {
    throw new Error(
      'No safe Applicant without Talent Pool history is available for reversible DB smoke validation.'
    );
  }

  const applicantId =
    String(
      applicant._id
    );

  const originalTalentPool =
    clone(
      applicant.talentPool
    );

  const marker =
    `b5j-runtime-${Date.now()}`;

  const actor = {
    id:
      marker,

    _id:
      marker,

    userId:
      marker,

    name:
      'B5J Runtime Validation',

    email:
      '',

    role:
      'ADMIN',
  };

  let category =
    null;

  try {
    category =
      await TalentPoolCategory
        .create({
          name:
            `B5J Runtime ${Date.now()}`,

          slug:
            marker,

          description:
            'Temporary reversible Talent Pool runtime validation category.',

          active:
            true,

          sortOrder:
            999999,

          createdBy:
            marker,

          updatedBy:
            marker,
        });

    console.log(
      '✅ Temporary category created'
    );

    await invoke(
      addMembership,
      {
        applicantId,

        actor,

        input: {
          categoryId:
            String(
              category._id
            ),

          roles: [
            'B5J Runtime Role',
          ],

          priority:
            'high',

          ownerId:
            marker,

          source:
            'b5j_runtime',

          reason:
            'Temporary reversible runtime validation.',
        },
      }
    );

    let current =
      await Applicant
        .findById(
          applicantId
        )
        .select(
          'talentPool'
        )
        .lean();

    if (
      current
        ?.talentPool
        ?.active !==
      true
    ) {
      throw new Error(
        'Real DB add-membership validation failed.'
      );
    }

    console.log(
      '✅ Real DB add membership'
    );

    await invoke(
      patchMembership,
      {
        applicantId,

        actor,

        input: {
          priority:
            'medium',

          roles: [
            'B5J Runtime Role',
            'B5J Runtime Secondary',
          ],
        },
      }
    );

    current =
      await Applicant
        .findById(
          applicantId
        )
        .select(
          'talentPool'
        )
        .lean();

    if (
      current
        ?.talentPool
        ?.priority !==
      'medium'
    ) {
      throw new Error(
        'Real DB patch-membership validation failed.'
      );
    }

    console.log(
      '✅ Real DB edit membership'
    );

    const future =
      new Date(
        Date.now() +
        14 *
        24 *
        60 *
        60 *
        1000
      );

    await invoke(
      scheduleReview,
      {
        applicantId,

        actor,

        input: {
          nextReviewAt:
            future.toISOString(),
        },
      }
    );

    current =
      await Applicant
        .findById(
          applicantId
        )
        .select(
          'talentPool'
        )
        .lean();

    if (
      !current
        ?.talentPool
        ?.nextReviewAt
    ) {
      throw new Error(
        'Real DB review-schedule validation failed.'
      );
    }

    console.log(
      '✅ Real DB schedule review'
    );

    await invoke(
      completeReview,
      {
        applicantId,

        actor,

        input: {},
      }
    );

    current =
      await Applicant
        .findById(
          applicantId
        )
        .select(
          'talentPool'
        )
        .lean();

    if (
      !current
        ?.talentPool
        ?.lastReviewedAt
    ) {
      throw new Error(
        'Real DB complete-review validation failed.'
      );
    }

    console.log(
      '✅ Real DB complete review'
    );

    await invoke(
      removeMembership,
      {
        applicantId,

        actor,

        reason:
          'B5J reversible validation',

        input: {
          reason:
            'B5J reversible validation',
        },
      }
    );

    current =
      await Applicant
        .findById(
          applicantId
        )
        .select(
          'talentPool'
        )
        .lean();

    if (
      current
        ?.talentPool
        ?.active !==
      false
    ) {
      throw new Error(
        'Real DB remove-membership validation failed.'
      );
    }

    console.log(
      '✅ Real DB soft remove membership'
    );

    await invoke(
      restoreMembership,
      {
        applicantId,
        actor,
        input: {},
      }
    );

    current =
      await Applicant
        .findById(
          applicantId
        )
        .select(
          'talentPool'
        )
        .lean();

    if (
      current
        ?.talentPool
        ?.active !==
      true
    ) {
      throw new Error(
        'Real DB restore-membership validation failed.'
      );
    }

    console.log(
      '✅ Real DB restore membership'
    );

    await recordApplicantActivity({
      applicantId,

      type:
        'talent_pool.updated',

      title:
        'B5J Talent Pool Audit validation',

      description:
        '',

      occurredAt:
        new Date(),

      actor: {
        userId:
          marker,

        name:
          'B5J Runtime Validation',

        email:
          '',

        role:
          'ADMIN',
      },

      source: {
        type:
          'talent_pool',

        id:
          marker,
      },

      changes: [
        {
          field:
            'talentPool.priority',

          label:
            'Priority',

          before:
            'high',

          after:
            'medium',
        },
      ],

      metadata: {
        b5jRuntime:
          true,
      },
    });

    const activity =
      await ApplicantActivity
        .findOne({
          applicantId:
            applicant._id,

          'source.id':
            marker,
        })
        .lean();

    if (!activity) {
      throw new Error(
        'Real DB Applicant Audit persistence validation failed.'
      );
    }

    console.log(
      '✅ Real DB Talent Pool Audit persistence'
    );

    console.log(
      '\nAPPLICANT TALENT POOL REAL DB SMOKE TEST PASSED'
    );
  } finally {
    await ApplicantActivity
      .deleteMany({
        applicantId:
          applicant._id,

        'source.id':
          marker,
      });

    if (
      originalTalentPool ===
      undefined
    ) {
      await Applicant.collection
        .updateOne(
          {
            _id:
              applicant._id,
          },
          {
            $unset: {
              talentPool:
                '',
            },
          }
        );
    } else {
      await Applicant.collection
        .updateOne(
          {
            _id:
              applicant._id,
          },
          {
            $set: {
              talentPool:
                originalTalentPool,
            },
          }
        );
    }

    if (category?._id) {
      await TalentPoolCategory
        .deleteOne({
          _id:
            category._id,
        });
    }

    console.log(
      '✅ Real DB test data fully reverted'
    );

    await mongoose.disconnect();
  }
}


main()
  .catch(
    async error => {
      console.error(
        `❌ ${error.message}`
      );

      try {
        await mongoose.disconnect();
      } catch {
        // ignore disconnect cleanup
      }

      process.exitCode =
        1;
    }
  );
