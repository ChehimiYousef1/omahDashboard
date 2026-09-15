'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  syncFormSubmissionDocuments,
} = require(
  '../services/applicantFormDocumentManagedSyncService'
);


const APPLICANT_ID =
  '66a000000000000000000001';

const SUBMISSION_ID =
  '66b000000000000000000001';

const DRIVE_DOCUMENT_ID =
  '66c000000000000000000001';

const NON_DRIVE_DOCUMENT_ID =
  '66d000000000000000000001';


function queryResult(
  value
) {
  return {
    select() {
      return this;
    },

    async lean() {
      return value;
    },
  };
}


async function run() {
  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );


  /*
   * --------------------------------------------------
   * 1. Disabled -> external sync only
   * --------------------------------------------------
   */
  {
    let importCalls = 0;

    const syncExternalFn =
      async () => ({
        status:
          'synced',

        submissionId:
          SUBMISSION_ID,

        applicantId:
          APPLICANT_ID,

        inserted:
          1,

        alreadyManaged:
          0,

        invalidUrls:
          0,

        duplicateFormUrls:
          0,

        rawDocumentValues:
          1,
      });


    const DocumentModel = {
      find() {
        throw new Error(
          'Document query must not run while managed import is disabled.'
        );
      },
    };


    const result =
      await syncFormSubmissionDocuments({
        submissionId:
          SUBMISSION_ID,

        applicantId:
          APPLICANT_ID,

        DocumentModel,

        syncExternalFn,

        importDocumentFn:
          async () => {
            importCalls += 1;

            return {
              status:
                'imported',
            };
          },

        env: {
          GOOGLE_DRIVE_DOCUMENT_IMPORT_ENABLED:
            'false',
        },
      });


    assert.strictEqual(
      result.managedImportEnabled,
      false
    );

    assert.strictEqual(
      result.managedImported,
      0
    );

    assert.strictEqual(
      importCalls,
      0
    );
  }


  console.log(
    '✅ disabled mode preserves external-only sync'
  );


  /*
   * --------------------------------------------------
   * 2. Enabled -> Drive external current becomes managed
   * --------------------------------------------------
   */
  {
    let externalDocuments = [
      {
        _id:
          DRIVE_DOCUMENT_ID,

        applicantId:
          APPLICANT_ID,

        documentType:
          'cv',

        storage: {
          provider:
            'external',

          externalUrl:
            'https://drive.google.com/file/d/1xwm1bbDD18zAb5jVf8FHa-yoe5gynAKr/view',
        },
      },
    ];


    let importCalls = 0;


    const syncExternalFn =
      async () => ({
        status:
          'synced',

        submissionId:
          SUBMISSION_ID,

        applicantId:
          APPLICANT_ID,

        inserted:
          1,

        alreadyManaged:
          0,

        invalidUrls:
          0,

        duplicateFormUrls:
          0,

        rawDocumentValues:
          1,
      });


    const DocumentModel = {
      find(filter) {
        assert.strictEqual(
          String(
            filter.applicantId
          ),
          APPLICANT_ID
        );

        assert.strictEqual(
          String(
            filter.sourceSubmissionId
          ),
          SUBMISSION_ID
        );

        assert.strictEqual(
          filter.source,
          'form_submission'
        );

        assert.strictEqual(
          filter.isCurrent,
          true
        );

        assert.strictEqual(
          filter[
            'storage.provider'
          ],
          'external'
        );

        return queryResult(
          externalDocuments
        );
      },
    };


    const importDocumentFn =
      async ({
        applicantId,
        documentId,
        uploadedBy,
      }) => {
        importCalls +=
          1;

        assert.strictEqual(
          applicantId,
          APPLICANT_ID
        );

        assert.strictEqual(
          documentId,
          DRIVE_DOCUMENT_ID
        );

        assert.strictEqual(
          uploadedBy,
          'system:form-drive-import'
        );


        /*
         * Simulate successful conversion:
         * external v1 is no longer current,
         * so replay should find nothing.
         */
        externalDocuments =
          [];


        return {
          status:
            'imported',
        };
      };


    const first =
      await syncFormSubmissionDocuments({
        submissionId:
          SUBMISSION_ID,

        applicantId:
          APPLICANT_ID,

        DocumentModel,

        syncExternalFn,

        importDocumentFn,

        env: {
          GOOGLE_DRIVE_DOCUMENT_IMPORT_ENABLED:
            'true',
        },
      });


    assert.strictEqual(
      first.managedImportEnabled,
      true
    );

    assert.strictEqual(
      first.managedImported,
      1
    );

    assert.strictEqual(
      first.managedImportFailed,
      0
    );

    assert.strictEqual(
      first.managedImportSkipped,
      0
    );

    assert.strictEqual(
      importCalls,
      1
    );


    /*
     * Replay:
     * already-converted current managed document
     * is not returned by the external query.
     */
    const second =
      await syncFormSubmissionDocuments({
        submissionId:
          SUBMISSION_ID,

        applicantId:
          APPLICANT_ID,

        DocumentModel,

        syncExternalFn,

        importDocumentFn,

        env: {
          GOOGLE_DRIVE_DOCUMENT_IMPORT_ENABLED:
            'true',
        },
      });


    assert.strictEqual(
      second.managedImported,
      0
    );

    assert.strictEqual(
      importCalls,
      1
    );
  }


  console.log(
    '✅ enabled mode imports Drive document'
  );

  console.log(
    '✅ replay creates no second managed import'
  );


  /*
   * --------------------------------------------------
   * 3. Drive failure must NOT break Form synchronization
   * --------------------------------------------------
   */
  {
    const DocumentModel = {
      find() {
        return queryResult([
          {
            _id:
              DRIVE_DOCUMENT_ID,

            applicantId:
              APPLICANT_ID,

            documentType:
              'cv',

            storage: {
              provider:
                'external',

              externalUrl:
                'https://drive.google.com/file/d/1xwm1bbDD18zAb5jVf8FHa-yoe5gynAKr/view',
            },
          },
        ]);
      },
    };


    const result =
      await syncFormSubmissionDocuments({
        submissionId:
          SUBMISSION_ID,

        applicantId:
          APPLICANT_ID,

        DocumentModel,

        syncExternalFn:
          async () => ({
            status:
              'synced',

            submissionId:
              SUBMISSION_ID,

            applicantId:
              APPLICANT_ID,

            inserted:
              1,

            alreadyManaged:
              0,

            invalidUrls:
              0,

            duplicateFormUrls:
              0,

            rawDocumentValues:
              1,
          }),

        importDocumentFn:
          async () => {
            const error =
              new Error(
                'File unavailable.'
              );

            error.code =
              'GOOGLE_DRIVE_FILE_NOT_FOUND';

            throw error;
          },

        env: {
          GOOGLE_DRIVE_DOCUMENT_IMPORT_ENABLED:
            'true',
        },
      });


    assert.strictEqual(
      result.managedImported,
      0
    );

    assert.strictEqual(
      result.managedImportFailed,
      1
    );

    assert.deepStrictEqual(
      result.managedImportFailures,
      [
        {
          documentId:
            DRIVE_DOCUMENT_ID,

          code:
            'GOOGLE_DRIVE_FILE_NOT_FOUND',
        },
      ]
    );
  }


  console.log(
    '✅ unavailable Drive file does not break Applicant ingestion'
  );


  /*
   * --------------------------------------------------
   * 4. Non-Drive external URLs are never server-fetched
   * --------------------------------------------------
   */
  {
    let importCalls =
      0;


    const DocumentModel = {
      find() {
        return queryResult([
          {
            _id:
              NON_DRIVE_DOCUMENT_ID,

            applicantId:
              APPLICANT_ID,

            documentType:
              'other',

            storage: {
              provider:
                'external',

              externalUrl:
                'https://example.com/document.pdf',
            },
          },
        ]);
      },
    };


    const result =
      await syncFormSubmissionDocuments({
        submissionId:
          SUBMISSION_ID,

        applicantId:
          APPLICANT_ID,

        DocumentModel,

        syncExternalFn:
          async () => ({
            status:
              'synced',

            submissionId:
              SUBMISSION_ID,

            applicantId:
              APPLICANT_ID,

            inserted:
              1,

            alreadyManaged:
              0,

            invalidUrls:
              0,

            duplicateFormUrls:
              0,

            rawDocumentValues:
              1,
          }),

        importDocumentFn:
          async () => {
            importCalls +=
              1;

            return {
              status:
                'imported',
            };
          },

        env: {
          GOOGLE_DRIVE_DOCUMENT_IMPORT_ENABLED:
            'true',
        },
      });


    assert.strictEqual(
      result.managedImportSkipped,
      1
    );

    assert.strictEqual(
      importCalls,
      0
    );
  }


  console.log(
    '✅ arbitrary external URLs are never server-fetched'
  );


  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );


  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '✅ no real Google Drive request'
  );

  console.log(
    '✅ no real filesystem write'
  );


  console.log(
    '\nAPPLICANT FORM MANAGED DOCUMENT SYNC TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(
      '❌ TEST FAILED:',
      error
    );

    process.exitCode =
      1;
  }
);
