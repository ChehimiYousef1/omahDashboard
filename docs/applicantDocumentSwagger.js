'use strict';

const applicantId = {
  name:
    'applicantId',
  in: 'path',
  required: true,

  schema: {
    type: 'string',
  },
};

const documentId = {
  name:
    'documentId',
  in: 'path',
  required: true,

  schema: {
    type: 'string',
  },
};

module.exports = {
  tags: [
    {
      name:
        'Applicant Documents',

      description:
        'Secure Applicant CV and document management.',
    },
  ],

  paths: {
    '/api/applicants/{applicantId}/documents':
      {
        get: {
          tags: [
            'Applicant Documents',
          ],

          summary:
            'List Applicant documents',

          parameters: [
            applicantId,

            {
              name:
                'includeArchived',
              in: 'query',

              schema: {
                type:
                  'boolean',
                default:
                  false,
              },
            },
          ],

          responses: {
            200: {
              description:
                'Document list',
            },
          },
        },

        post: {
          tags: [
            'Applicant Documents',
          ],

          summary:
            'Upload a new Applicant document',

          parameters: [
            applicantId,
          ],

          requestBody: {
            required: true,

            content: {
              'multipart/form-data':
                {
                  schema: {
                    type:
                      'object',

                    required: [
                      'documentType',
                      'file',
                    ],

                    properties: {
                      documentType:
                        {
                          type:
                            'string',

                          enum: [
                            'cv',
                            'cover_letter',
                            'certificate',
                            'transcript',
                            'portfolio',
                            'identity_document',
                            'other',
                          ],
                        },

                      title: {
                        type:
                          'string',
                      },

                      file: {
                        type:
                          'string',

                        format:
                          'binary',
                      },
                    },
                  },
                },
            },
          },

          responses: {
            201: {
              description:
                'Document uploaded',
            },
          },
        },
      },

    '/api/applicants/{applicantId}/documents/{documentId}/versions':
      {
        get: {
          tags: [
            'Applicant Documents',
          ],

          summary:
            'List document versions',

          parameters: [
            applicantId,
            documentId,
          ],

          responses: {
            200: {
              description:
                'Version history',
            },
          },
        },

        post: {
          tags: [
            'Applicant Documents',
          ],

          summary:
            'Upload a replacement version',

          parameters: [
            applicantId,
            documentId,
          ],

          requestBody: {
            required: true,

            content: {
              'multipart/form-data':
                {
                  schema: {
                    type:
                      'object',

                    required: [
                      'file',
                    ],

                    properties: {
                      title: {
                        type:
                          'string',
                      },

                      file: {
                        type:
                          'string',

                        format:
                          'binary',
                      },
                    },
                  },
                },
            },
          },

          responses: {
            201: {
              description:
                'New immutable version created',
            },
          },
        },
      },

    '/api/applicants/{applicantId}/documents/{documentId}/download':
      {
        get: {
          tags: [
            'Applicant Documents',
          ],

          summary:
            'Download or securely redirect to a document',

          parameters: [
            applicantId,
            documentId,
          ],

          responses: {
            200: {
              description:
                'Local file download',
            },

            302: {
              description:
                'Signed S3 or legacy external URL redirect',
            },
          },
        },
      },

    '/api/applicants/{applicantId}/documents/{documentId}/current':
      {
        post: {
          tags: [
            'Applicant Documents',
          ],

          summary:
            'Set this version as current',

          parameters: [
            applicantId,
            documentId,
          ],

          responses: {
            200: {
              description:
                'Current version updated',
            },
          },
        },
      },

    '/api/applicants/{applicantId}/documents/{documentId}/archive':
      {
        post: {
          tags: [
            'Applicant Documents',
          ],

          summary:
            'Archive a document version',

          parameters: [
            applicantId,
            documentId,
          ],

          responses: {
            200: {
              description:
                'Document archived',
            },
          },
        },
      },

    '/api/applicants/{applicantId}/documents/{documentId}/restore':
      {
        post: {
          tags: [
            'Applicant Documents',
          ],

          summary:
            'Restore an archived document version',

          parameters: [
            applicantId,
            documentId,
          ],

          responses: {
            200: {
              description:
                'Document restored',
            },
          },
        },
      },
  },
};

