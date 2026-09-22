'use strict';

module.exports = {
  tags: [
    {
      name:
        'Applicant Reports & Export',

      description:
        'Protected read-only Applicant recruitment PDF exports.',
    },
  ],

  paths: {
    '/api/applicants/{applicantId}/reports/summary.pdf':
      {
        get: {
          tags: [
            'Applicant Reports & Export',
          ],

          summary:
            'Export Applicant summary PDF',

          description:
            'Generates a protected Applicant recruitment summary PDF using whitelisted Applicant profile, latest Interview, and latest Evaluation fields. Internal notes, communication content, storage metadata, provider URLs, checksums, and Evaluation free-text content are excluded.',

          security: [
            {
              cookieAuth: [],
            },
          ],

          parameters: [
            {
              name:
                'applicantId',

              in:
                'path',

              required:
                true,

              schema: {
                type:
                  'string',
              },

              description:
                'Applicant MongoDB ObjectId',
            },
          ],

          responses: {
            200: {
              description:
                'Applicant summary PDF',

              headers: {
                'Content-Disposition':
                  {
                    description:
                      'Attachment filename for the generated PDF.',

                    schema: {
                      type:
                        'string',
                    },
                  },
              },

              content: {
                'application/pdf':
                  {
                    schema: {
                      type:
                        'string',

                      format:
                        'binary',
                    },
                  },
              },
            },

            400: {
              $ref:
                '#/components/responses/BadRequest',
            },

            401: {
              $ref:
                '#/components/responses/Unauthorized',
            },

            403: {
              $ref:
                '#/components/responses/Forbidden',
            },

            404: {
              $ref:
                '#/components/responses/NotFound',
            },

            500: {
              $ref:
                '#/components/responses/InternalError',
            },
          },
        },
      },
  },
};
