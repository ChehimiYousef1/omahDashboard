'use strict';

require('dotenv').config({
  quiet: true,
});

const mongoose =
  require('mongoose');

const ApplicantDocument =
  require(
    '../models/ApplicantDocument'
  );

const {
  extractDriveFileId,
} = require(
  '../services/googleDriveDocumentService'
);

const {
  importExternalFormDocument,
} = require(
  '../services/applicantDriveImportService'
);

const {
  createDocumentStorageFactory,
} = require(
  '../services/documentStorageFactory'
);


function text(value) {
  return String(
    value ?? ''
  ).trim();
}


function argumentValue(
  prefix
) {
  const argument =
    process.argv.find(
      item =>
        item.startsWith(
          prefix
        )
    );

  if (!argument) {
    return '';
  }

  return argument
    .slice(
      prefix.length
    )
    .trim();
}


function positiveInteger(
  value
) {
  if (!value) {
    return null;
  }

  const number =
    Number(value);

  if (
    !Number.isInteger(
      number
    ) ||
    number < 1
  ) {
    throw new Error(
      'limit must be a positive integer.'
    );
  }

  return number;
}


function sleep(ms) {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}


async function run() {
  const apply =
    process.argv.includes(
      '--apply'
    );

  const confirmLocalStorage =
    process.argv.includes(
      '--confirm-local-storage'
    );

  const applicantId =
    argumentValue(
      '--applicant='
    );

  const limit =
    positiveInteger(
      argumentValue(
        '--limit='
      )
    );


  if (
    !process.env.MONGODB_URI
  ) {
    throw new Error(
      'MONGODB_URI is not configured.'
    );
  }


  console.log(
    '===================================================='
  );

  console.log(
    ' GOOGLE DRIVE FORM DOCUMENT -> MANAGED STORAGE'
  );

  console.log(
    '===================================================='
  );


  await mongoose.connect(
    process.env.MONGODB_URI
  );


  console.log('');
  console.log(
    'MongoDB host:',
    mongoose.connection.host
  );

  console.log(
    'MongoDB database:',
    mongoose.connection.name
  );

  console.log(
    'NODE_ENV:',
    process.env.NODE_ENV ||
      '(not configured)'
  );


  const storageFactory =
    createDocumentStorageFactory();

  const storageProvider =
    storageFactory
      .getUploadProvider();


  console.log(
    'Managed storage provider:',
    storageProvider.provider
  );


  const filter = {
    source:
      'form_submission',

    isCurrent:
      true,

    'lifecycle.archived': {
      $ne: true,
    },

    'storage.provider':
      'external',
  };


  if (applicantId) {
    if (
      !mongoose.Types.ObjectId
        .isValid(
          applicantId
        )
    ) {
      throw new Error(
        'Invalid --applicant ObjectId.'
      );
    }

    filter.applicantId =
      new mongoose.Types.ObjectId(
        applicantId
      );
  }


  let query =
    ApplicantDocument
      .find(filter)
      .select(
        '_id applicantId documentType title version documentGroupId storage.externalUrl'
      )
      .sort({
        applicantId: 1,
        documentType: 1,
        uploadedAt: 1,
      });


  if (limit) {
    query =
      query.limit(
        limit
      );
  }


  const documents =
    await query.lean();


  const validDriveDocuments =
    [];

  const invalidExternalDocuments =
    [];


  const byType = {};


  for (
    const document
    of documents
  ) {
    const type =
      text(
        document.documentType
      ) ||
      'unknown';

    byType[type] =
      (byType[type] || 0) +
      1;


    const driveId =
      extractDriveFileId(
        document.storage
          ?.externalUrl
      );


    if (driveId) {
      validDriveDocuments.push(
        document
      );
    } else {
      invalidExternalDocuments.push(
        document
      );
    }
  }


  console.log('');
  console.log(
    'Current EXTERNAL Form documents:',
    documents.length
  );

  console.log(
    'Valid Google Drive candidates:',
    validDriveDocuments.length
  );

  console.log(
    'Invalid/non-Drive external:',
    invalidExternalDocuments.length
  );


  console.log('');
  console.log(
    'By document type:'
  );


  for (
    const [
      type,
      count,
    ]
    of Object.entries(
      byType
    ).sort()
  ) {
    console.log(
      ` ${type}: ${count}`
    );
  }


  if (!apply) {
    console.log('');
    console.log(
      '============================================'
    );

    console.log(
      ' DRY RUN ONLY'
    );

    console.log(
      '============================================'
    );

    console.log(
      '✅ No Drive file downloaded'
    );

    console.log(
      '✅ No ApplicantDocument modified'
    );

    console.log(
      '✅ No local/S3 file created'
    );

    console.log(
      '✅ Google Drive remains read-only'
    );

    console.log('');
    console.log(
      'To perform the migration later, use --apply.'
    );

    return;
  }


  /*
   * Important safety interlock.
   *
   * A LOCAL document belongs to the filesystem
   * of the machine running this script.
   *
   * We require explicit acknowledgement before
   * performing a bulk migration using local
   * storage.
   */
  if (
    storageProvider.provider ===
      'local' &&
    !confirmLocalStorage
  ) {
    const error =
      new Error(
        [
          'Bulk import is using LOCAL document storage.',
          '',
          'No documents were changed.',
          '',
          'Confirm that this machine/filesystem is the one',
          'that will serve these Applicant documents.',
          '',
          'Then rerun with:',
          '--apply --confirm-local-storage',
        ].join('\n')
      );

    error.code =
      'LOCAL_STORAGE_CONFIRMATION_REQUIRED';

    throw error;
  }


  if (
    storageProvider.provider ===
      'external'
  ) {
    const error =
      new Error(
        'Bulk Drive import requires local or S3 managed storage.'
      );

    error.code =
      'MANAGED_STORAGE_REQUIRED';

    throw error;
  }


  console.log('');
  console.log(
    '============================================'
  );

  console.log(
    ' APPLY MODE'
  );

  console.log(
    '============================================'
  );


  let imported = 0;
  let alreadyManaged = 0;
  let failed = 0;

  const failures = [];


  for (
    let index = 0;
    index <
      validDriveDocuments.length;
    index += 1
  ) {
    const document =
      validDriveDocuments[index];


    const prefix =
      `[${index + 1}/${validDriveDocuments.length}]`;


    try {
      const result =
        await importExternalFormDocument({
          applicantId:
            String(
              document.applicantId
            ),

          documentId:
            String(
              document._id
            ),

          uploadedBy:
            'migration:drive-managed-import',

          storageFactory,
        });


      if (
        result.status ===
          'imported'
      ) {
        imported += 1;

        console.log(
          `${prefix} ✅ imported` +
          ` | ${document.documentType}` +
          ` | ${document._id}`
        );
      } else {
        alreadyManaged +=
          1;

        console.log(
          `${prefix} ↪ ${result.status}` +
          ` | ${document.documentType}` +
          ` | ${document._id}`
        );
      }
    } catch (error) {
      failed += 1;

      failures.push({
        documentId:
          String(
            document._id
          ),

        applicantId:
          String(
            document.applicantId
          ),

        documentType:
          document.documentType,

        code:
          error.code ||
          'UNKNOWN_ERROR',

        message:
          error.message ||
          'Unknown error',
      });


      console.error(
        `${prefix} ❌ failed` +
        ` | ${document.documentType}` +
        ` | ${document._id}` +
        ` | ${error.code || 'UNKNOWN_ERROR'}`
      );
    }


    /*
     * Keep API requests sequential and slightly
     * spaced. This is intentionally conservative.
     */
    await sleep(
      100
    );
  }


  const remaining =
    await ApplicantDocument
      .countDocuments({
        source:
          'form_submission',

        isCurrent:
          true,

        'lifecycle.archived': {
          $ne: true,
        },

        'storage.provider':
          'external',
      });


  console.log('');
  console.log(
    '============================================'
  );

  console.log(
    ' IMPORT SUMMARY'
  );

  console.log(
    '============================================'
  );

  console.log(
    'Candidates:',
    validDriveDocuments.length
  );

  console.log(
    'Imported:',
    imported
  );

  console.log(
    'Already managed:',
    alreadyManaged
  );

  console.log(
    'Failed:',
    failed
  );

  console.log(
    'Remaining current external Form documents:',
    remaining
  );


  if (
    failures.length
  ) {
    console.log('');
    console.log(
      'Failures:'
    );

    for (
      const failure
      of failures
    ) {
      console.log(
        [
          '-',
          failure.documentId,
          '|',
          failure.documentType,
          '|',
          failure.code,
          '|',
          failure.message,
        ].join(' ')
      );
    }
  }


  console.log('');
  console.log(
    '✅ Bulk importer completed'
  );

  console.log(
    '✅ Successful documents now use managed storage'
  );

  console.log(
    '✅ Failed documents remain external/current'
  );

  console.log(
    '✅ Safe to rerun; converted documents are skipped by the query'
  );
}


run()
  .catch(
    error => {
      console.error('');
      console.error(
        '❌ IMPORT SCRIPT FAILED'
      );

      console.error(
        'Code:',
        error.code ||
          '(none)'
      );

      console.error(
        'Message:',
        error.message ||
          '(none)'
      );

      process.exitCode =
        1;
    }
  )
  .finally(
    async () => {
      if (
        mongoose.connection
          .readyState !== 0
      ) {
        await mongoose.disconnect();
      }
    }
  );
