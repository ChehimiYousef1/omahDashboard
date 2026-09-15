'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const {
  getDocumentDownload,
  setCurrentDocumentVersion,
} = require(
  '../services/applicantDocumentService'
);

const APPLICANT_ID =
  '66a000000000000000000001';

const DOCUMENT_ID =
  '66b000000000000000000001';


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


function applicantModel() {
  return {
    findOne() {
      return queryResult({
        _id:
          APPLICANT_ID,
      });
    },
  };
}


function documentModel(
  document
) {
  return {
    findOne() {
      return queryResult(
        document
      );
    },

    async updateOne() {
      throw new Error(
        'updateOne must not run for blocked external Form documents.'
      );
    },
  };
}


async function run() {
  let providerCalls =
    0;

  const storageFactory = {
    getProvider(
      provider
    ) {
      providerCalls +=
        1;

      assert.strictEqual(
        provider,
        'external'
      );

      return {
        async getDownloadDescriptor({
          externalUrl,
        }) {
          return {
            kind:
              'external_url',

            url:
              externalUrl,
          };
        },
      };
    },
  };


  const externalForm = {
    _id:
      DOCUMENT_ID,

    applicantId:
      APPLICANT_ID,

    documentGroupId:
      'form-test',

    source:
      'form_submission',

    isCurrent:
      true,

    storage: {
      provider:
        'external',

      externalUrl:
        'https://drive.google.com/file/d/test-file/view',
    },

    lifecycle: {
      archived:
        false,
    },
  };


  await assert.rejects(
    () =>
      getDocumentDownload({
        applicantId:
          APPLICANT_ID,

        documentId:
          DOCUMENT_ID,

        ApplicantModel:
          applicantModel(),

        DocumentModel:
          documentModel(
            externalForm
          ),

        storageFactory,
      }),

    error =>
      error?.code ===
        'FORM_DOCUMENT_MANAGED_COPY_REQUIRED'
  );

  assert.strictEqual(
    providerCalls,
    0,
    'Blocked Form document must never reach external storage provider.'
  );

  console.log(
    '✅ external Form download blocked before redirect'
  );


  const legacyExternal = {
    ...externalForm,

    source:
      'legacy_import',
  };


  const legacyResult =
    await getDocumentDownload({
      applicantId:
        APPLICANT_ID,

      documentId:
        DOCUMENT_ID,

      ApplicantModel:
        applicantModel(),

      DocumentModel:
        documentModel(
          legacyExternal
        ),

      storageFactory,
    });


  assert.strictEqual(
    legacyResult
      .descriptor
      .kind,
    'external_url'
  );

  assert.strictEqual(
    providerCalls,
    1
  );

  console.log(
    '✅ unrelated external-document behavior preserved'
  );


  const historicalExternalForm = {
    ...externalForm,

    isCurrent:
      false,
  };


  await assert.rejects(
    () =>
      setCurrentDocumentVersion({
        applicantId:
          APPLICANT_ID,

        documentId:
          DOCUMENT_ID,

        ApplicantModel:
          applicantModel(),

        DocumentModel:
          documentModel(
            historicalExternalForm
          ),
      }),

    error =>
      error?.code ===
        'FORM_DOCUMENT_MANAGED_COPY_REQUIRED'
  );

  console.log(
    '✅ historical external Form version cannot become current'
  );


  const routeSource =
    fs.readFileSync(
      require.resolve(
        '../src/routes/applicantDocuments.routes'
      ),
      'utf8'
    );

  assert(
    routeSource.includes(
      "'FORM_DOCUMENT_MANAGED_COPY_REQUIRED'"
    )
  );

  console.log(
    '✅ API error policy registered'
  );

  console.log(
    '\nAPPLICANT EXTERNAL FORM DOCUMENT POLICY TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(error);
    process.exitCode =
      1;
  }
);
