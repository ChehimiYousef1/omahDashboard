'use strict';

require('dotenv').config({
  quiet: true,
});

const mongoose =
  require('mongoose');

const ApplicantFormSubmission =
  require(
    '../models/ApplicantFormSubmission'
  );

const ApplicantDocument =
  require(
    '../models/ApplicantDocument'
  );

const {
  buildFormDocumentMigrationPlan,
  buildManagedFormDocumentRecord,
} = require(
  '../services/applicantFormDocumentMigrationService'
);


function argumentValue(
  name
) {
  const prefix =
    `--${name}=`;

  const argument =
    process.argv.find(
      value =>
        value.startsWith(
          prefix
        )
    );

  return argument
    ? argument.slice(
        prefix.length
      ).trim()
    : '';
}


function printBreakdown(
  candidates
) {
  const counts =
    new Map();

  for (
    const candidate
    of candidates
  ) {
    const key =
      (
        candidate
          .documentType +
        ' | ' +
        candidate.title
      );

    counts.set(
      key,
      (
        counts.get(
          key
        ) ||
        0
      ) + 1
    );
  }

  if (
    counts.size ===
    0
  ) {
    return;
  }

  console.log(
    '\nPlanned managed document types:'
  );

  for (
    const [
      label,
      count,
    ]
    of Array.from(
      counts.entries()
    ).sort()
  ) {
    console.log(
      `  ${label}: ${count}`
    );
  }
}


async function run() {
  const apply =
    process.argv.includes(
      '--apply'
    );

  const applicantId =
    argumentValue(
      'applicant'
    );


  if (
    !process.env.MONGODB_URI
  ) {
    throw new Error(
      'MONGODB_URI is not configured.'
    );
  }


  if (
    applicantId &&
    !mongoose.Types.ObjectId
      .isValid(
        applicantId
      )
  ) {
    throw new Error(
      '--applicant must be a valid MongoDB ObjectId.'
    );
  }


  console.log(
    apply
      ? 'MODE: APPLY (database writes enabled)'
      : 'MODE: DRY RUN (no database writes)'
  );


  if (applicantId) {
    console.log(
      'Applicant scope:',
      applicantId
    );
  } else {
    console.log(
      'Applicant scope: all linked submissions'
    );
  }


  await mongoose.connect(
    process.env.MONGODB_URI
  );


  const submissionFilter = {
    applicantId: {
      $ne:
        null,
    },
  };

  const documentFilter = {};


  if (applicantId) {
    const objectId =
      new mongoose.Types.ObjectId(
        applicantId
      );

    submissionFilter.applicantId =
      objectId;

    documentFilter.applicantId =
      objectId;
  }


  const submissions =
    await ApplicantFormSubmission
      .find(
        submissionFilter
      )
      .select([
        '_id',
        'applicantId',
        'submittedAt',
        'createdAt',

        'documents.cvResume',
        'documents.identityDocument',
        'documents.enrollmentDocument',
        'documents.degreeCertificate',
        'documents.trainingCertificates',
        'documents.recommendationLetters',
        'documents.portfolioWorkSamples',
        'documents.additionalSupportingDocuments',
      ].join(' '))
      .sort({
        submittedAt:
          -1,
      })
      .lean();


  const existingDocuments =
    await ApplicantDocument
      .find(
        documentFilter
      )
      .select([
        '_id',
        'applicantId',
        'documentGroupId',
        'storage.provider',
        'storage.externalUrl',
      ].join(' '))
      .lean();


  const plan =
    buildFormDocumentMigrationPlan({
      submissions,
      existingDocuments,
    });


  console.log(
    '\n--- MIGRATION PLAN ---'
  );

  console.log(
    'Submissions scanned:',
    plan.summary
      .submissionsScanned
  );

  console.log(
    'Linked submissions:',
    plan.summary
      .linkedSubmissions
  );

  console.log(
    'Raw document values:',
    plan.summary
      .rawDocumentValues
  );

  console.log(
    'Invalid/unusable values:',
    plan.summary
      .invalidUrls
  );

  console.log(
    'Repeated Form URLs:',
    plan.summary
      .duplicateFormUrls
  );

  console.log(
    'Already managed:',
    plan.summary
      .alreadyManaged
  );

  console.log(
    'Would create:',
    plan.summary
      .wouldCreate
  );


  printBreakdown(
    plan.candidates
  );


  if (!apply) {
    console.log(
      '\n✅ DRY RUN COMPLETE'
    );

    console.log(
      'No ApplicantDocument records were inserted or modified.'
    );

    return;
  }


  let inserted = 0;
  let skipped = 0;


  for (
    const candidate
    of plan.candidates
  ) {
    /*
     * Re-check the URL immediately before writing.
     * This protects against a concurrent/manual import.
     */
    const existing =
      await ApplicantDocument
        .findOne({
          applicantId:
            candidate
              .applicantId,

          'storage.externalUrl':
            candidate
              .externalUrl,
        })
        .select('_id')
        .lean();


    if (existing) {
      skipped +=
        1;

      continue;
    }


    const record =
      buildManagedFormDocumentRecord(
        candidate
      );


    const result =
      await ApplicantDocument
        .updateOne(
          {
            documentGroupId:
              candidate
                .documentGroupId,

            version:
              1,
          },

          {
            $setOnInsert:
              record,
          },

          {
            upsert:
              true,

            runValidators:
              true,
          }
        );


    if (
      result.upsertedCount ===
      1
    ) {
      inserted +=
        1;
    } else {
      skipped +=
        1;
    }
  }


  console.log(
    '\n--- APPLY RESULT ---'
  );

  console.log(
    'Inserted:',
    inserted
  );

  console.log(
    'Skipped:',
    skipped
  );

  console.log(
    '\n✅ MIGRATION APPLY COMPLETE'
  );
}


run()
  .catch(
    error => {
      console.error(
        '\n❌ Migration failed:',
        error
          ?.message ||
        error
      );

      process.exitCode =
        1;
    }
  )
  .finally(
    async () => {
      await mongoose
        .disconnect()
        .catch(
          () => {}
        );
    }
  );
