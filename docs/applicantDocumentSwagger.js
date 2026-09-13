'use strict';

const security = [
  {
    cookieAuth: [],
  },
];

const applicantId = {
  name: 'applicantId',
  in: 'path',
  required: true,

  description:
    'Applicant MongoDB ObjectId',

  schema: {
    type: 'string',
  },
};

const documentId = {
  name: 'documentId',
  in: 'path',
  required: true,

  description:
    'ApplicantDocument MongoDB ObjectId',

  schema: {
    type: 'string',
  },
};

const errorResponses = {
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

  409: {
    $ref:
      '#/components/responses/Conflict',
  },

  500: {
    $ref:
      '#/components/responses/InternalError',
  },
};

const documentResponseSchema = {
  type: 'object',

  properties: {
    _id: {
      type: 'string',
    },

    applicantId: {
      type: 'string',
    },

    documentGroupId: {
      type: 'string',
    },

    documentType: {
      type: 'string',

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
      type: 'string',
    },

    version: {
      type: 'integer',
      minimum: 1,
    },

    isCurrent: {
      type: 'boolean',
    },

    file: {
      type: 'object',

      properties: {
        originalFileName: {
          type: 'string',
        },

        mimeType: {
          type: 'string',
        },

        sizeBytes: {
          type: 'integer',
        },

        checksumSha256: {
          type: 'string',
        },
      },
    },

    storage: {
      type: 'object',

      properties: {
        provider: {
          type: 'string',

          enum: [
            'external',
            'local',
            's3',
          ],
        },
      },
    },

    lifecycle: {
      type: 'object',

      properties: {
        archived: {
          type: 'boolean',
        },

        archivedAt: {
          type: [
            'string',
            'null',
          ],

          format: 'date-time',
        },
      },
    },

    uploadedBy: {
      type: 'string',
    },

    uploadedAt: {
      type: 'string',
      format: 'date-time',
    },
  },
};

const multipartUpload = {
  required: true,

  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',

        required: [
          'documentType',
          'file',
        ],

        properties: {
          documentType: {
            type: 'string',

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
            type: 'string',
            maxLength: 200,
          },

          file: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  },
};

const replacementUpload = {
  required: true,

  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',

        required: [
          'file',
        ],

        properties: {
          title: {
            type: 'string',
            maxLength: 200,
          },

          file: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  },
};

module.exports = {
  tags: [
    {
      name:
        'Applicant Documents',

      description:
        'Admin-only secure CV and Applicant document management with immutable version history.',
    },
  ],

  paths: {
    '/api/applicants/{applicantId}/documents':
      {
        get: {
          tags: [
            'Applicant Documents',
          ],

          operationId:
            'listApplicantDocuments',

          summary:
            'List Applicant documents',

          description:
            'Returns document metadata. Archived versions are excluded unless explicitly requested.',

          security,

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
                'Applicant document list',

              content: {
                'application/json':
                  {
                    schema: {
                      type:
                        'object',

                      properties: {
                        success: {
                          type:
                            'boolean',
                        },

                        documents:
                          {
                            type:
                              'array',

                            items:
                              documentResponseSchema,
                          },
                      },
                    },
                  },
              },
            },

            ...errorResponses,
          },
        },

        post: {
          tags: [
            'Applicant Documents',
          ],

          operationId:
            'uploadApplicantDocument',

          summary:
            'Upload a new Applicant document',

          description:
            'Uploads a validated private document. Files are limited to 10 MB and accepted formats are PDF, DOCX, JPEG and PNG according to document type.',

          security,

          parameters: [
            applicantId,
          ],

          requestBody:
            multipartUpload,

          responses: {
            201: {
              description:
                'Document created',

              content: {
                'application/json':
                  {
                    schema: {
                      type:
                        'object',

                      properties: {
                        success: {
                          type:
                            'boolean',
                        },

                        document:
                          documentResponseSchema,
                      },
                    },
                  },
              },
            },

            ...errorResponses,
          },
        },
      },

    '/api/applicants/{applicantId}/documents/{documentId}/versions':
      {
        get: {
          tags: [
            'Applicant Documents',
          ],

          operationId:
            'getApplicantDocumentVersions',

          summary:
            'Get immutable document version history',

          security,

          parameters: [
            applicantId,
            documentId,
          ],

          responses: {
            200: {
              description:
                'Document version history',

              content: {
                'application/json':
                  {
                    schema: {
                      type:
                        'object',

                      properties: {
                        success: {
                          type:
                            'boolean',
                        },

                        versions: {
                          type:
                            'array',

                          items:
                            documentResponseSchema,
                        },
                      },
                    },
                  },
              },
            },

            ...errorResponses,
          },
        },

        post: {
          tags: [
            'Applicant Documents',
          ],

          operationId:
            'uploadApplicantDocumentVersion',

          summary:
            'Upload a replacement version',

          description:
            'Creates version N+1 and preserves all previous versions.',

          security,

          parameters: [
            applicantId,
            documentId,
          ],

          requestBody:
            replacementUpload,

          responses: {
            201: {
              description:
                'New immutable document version created',
            },

            ...errorResponses,
          },
        },
      },

    '/api/applicants/{applicantId}/documents/{documentId}/download':
      {
        get: {
          tags: [
            'Applicant Documents',
          ],

          operationId:
            'downloadApplicantDocument',

          summary:
            'Securely download/view a document',

          description:
            'Local documents are streamed after authentication. S3 documents use a short-lived signed URL. Legacy external documents redirect to their preserved external URL.',

          security,

          parameters: [
            applicantId,
            documentId,
          ],

          responses: {
            200: {
              description:
                'Authenticated local document download',
            },

            302: {
              description:
                'Short-lived S3 signed URL or preserved legacy external URL',
            },

            ...errorResponses,
          },
        },
      },

    '/api/applicants/{applicantId}/documents/{documentId}/current':
      {
        post: {
          tags: [
            'Applicant Documents',
          ],

          operationId:
            'setApplicantDocumentCurrentVersion',

          summary:
            'Set a version as current',

          description:
            'Changes which non-archived version represents the current document without deleting version history.',

          security,

          parameters: [
            applicantId,
            documentId,
          ],

          responses: {
            200: {
              description:
                'Current version updated',
            },

            ...errorResponses,
          },
        },
      },

    '/api/applicants/{applicantId}/documents/{documentId}/archive':
      {
        post: {
          tags: [
            'Applicant Documents',
          ],

          operationId:
            'archiveApplicantDocument',

          summary:
            'Archive a document version',

          description:
            'Soft-deletes the document metadata. If the current version is archived, the newest remaining active version becomes current. No physical file is deleted.',

          security,

          parameters: [
            applicantId,
            documentId,
          ],

          requestBody: {
            required:
              false,

            content: {
              'application/json':
                {
                  schema: {
                    type:
                      'object',

                    properties: {
                      reason: {
                        type:
                          'string',

                        maxLength:
                          500,
                      },
                    },
                  },
                },
            },
          },

          responses: {
            200: {
              description:
                'Document archived',
            },

            ...errorResponses,
          },
        },
      },

    '/api/applicants/{applicantId}/documents/{documentId}/restore':
      {
        post: {
          tags: [
            'Applicant Documents',
          ],

          operationId:
            'restoreApplicantDocument',

          summary:
            'Restore an archived document version',

          description:
            'Restores the archived version. Restoration does not automatically make it the current version.',

          security,

          parameters: [
            applicantId,
            documentId,
          ],

          responses: {
            200: {
              description:
                'Document restored',
            },

            ...errorResponses,
          },
        },
      },
  },
};

