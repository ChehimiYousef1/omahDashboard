'use strict';

const idParameter = {
  name: 'id',
  in: 'path',
  required: true,

  schema: {
    type: 'string',
  },

  description:
    'Applicant MongoDB ObjectId',
};

const submissionIdParameter = {
  name: 'submissionId',
  in: 'path',
  required: true,

  schema: {
    type: 'string',
  },

  description:
    'ApplicantFormSubmission MongoDB ObjectId',
};

const successResponse = {
  description:
    'Successful operation',
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

module.exports = {
  openapi: '3.0.3',

  info: {
    title:
      'OMAH Applicant Management API',

    version: '1.0.0',

    description:
      'Admin-only API for the Applicant master profile and immutable submission architecture.',
  },

  servers: [
    {
      url: '/',
    },
  ],

  security: [
    {
      cookieAuth: [],
    },
  ],

  tags: [
    {
      name: 'Applicants',
    },
  ],

  paths: {
    '/api/applicants/duplicates': {
      get: {
        tags: [
          'Applicants',
        ],

        summary:
          'List Applicant duplicate review cases',

        security: [
          {
            cookieAuth: [],
          },
        ],

        parameters: [
          {
            in: 'query',
            name: 'status',

            schema: {
              type: 'string',

              enum: [
                'open',
                'under_review',
                'resolved',
                'all',
              ],
            },
          },

          {
            in: 'query',
            name: 'applicantId',

            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'page',

            schema: {
              type: 'integer',
              minimum: 1,
            },
          },

          {
            in: 'query',
            name: 'limit',

            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
            },
          },
        ],

        responses: {
          200: {
            description:
              'Duplicate review cases',
          },

          401: {
            $ref:
              '#/components/responses/Unauthorized',
          },

          403: {
            $ref:
              '#/components/responses/Forbidden',
          },

          500: {
            $ref:
              '#/components/responses/InternalError',
          },
        },
      },
    },


    '/api/applicants/duplicates/{caseId}': {
      get: {
        tags: [
          'Applicants',
        ],

        summary:
          'Get an Applicant duplicate review case',

        security: [
          {
            cookieAuth: [],
          },
        ],

        parameters: [
          {
            in: 'path',
            name: 'caseId',
            required: true,

            schema: {
              type: 'string',
            },
          },
        ],

        responses: {
          200: {
            description:
              'Duplicate review case',
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


    '/api/applicants/duplicates/{caseId}/resolve': {
      patch: {
        tags: [
          'Applicants',
        ],

        summary:
          'Resolve an Applicant duplicate review case',

        description:
          'Records the administrator review decision only. This endpoint does not automatically merge or delete Applicants.',

        security: [
          {
            cookieAuth: [],
          },
        ],

        parameters: [
          {
            in: 'path',
            name: 'caseId',
            required: true,

            schema: {
              type: 'string',
            },
          },
        ],

        requestBody: {
          required: true,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                required: [
                  'decision',
                ],

                properties: {
                  decision: {
                    type:
                      'string',

                    enum: [
                      'same_person',
                      'not_duplicate',
                      'keep_separate',
                    ],
                  },

                  notes: {
                    type:
                      'string',

                    maxLength:
                      2000,
                  },
                },
              },
            },
          },
        },

        responses: {
          200: {
            description:
              'Duplicate review case resolved',
          },

          400: {
            description:
              'Invalid duplicate review request',
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
        },
      },
    },


    '/api/applicants': {
      get: {
        tags: ['Applicants'],

        summary:
          'Search and list applicants',

        description:
          'Server-side Applicant search, filtering, sorting, lifecycle filtering, and pagination.',

        parameters: [
          {
            name: 'q',
            in: 'query',

            description:
              'Free-text search across Applicant identity, education, skills, profiles, and tags.',

            schema: {
              type: 'string',
              maxLength: 120,
            },
          },

          {
            name: 'status',
            in: 'query',

            schema: {
              type: 'string',

              enum: [
                'applied',
                'reviewed',
                'interview',
                'hired',
                'rejected',
              ],
            },
          },

          {
            name: 'positionTrack',
            in: 'query',

            schema: {
              type: 'string',
              maxLength: 100,
            },
          },

          {
            name: 'positionType',
            in: 'query',

            schema: {
              type: 'string',
              maxLength: 100,
            },
          },

          {
            name: 'country',
            in: 'query',

            schema: {
              type: 'string',
              maxLength: 100,
            },
          },

          {
            name: 'city',
            in: 'query',

            schema: {
              type: 'string',
              maxLength: 100,
            },
          },

          {
            name: 'source',
            in: 'query',

            schema: {
              type: 'string',
              maxLength: 100,
            },
          },

          {
            name: 'assignedRecruiterId',
            in: 'query',

            schema: {
              type: 'string',
              maxLength: 100,
            },
          },

          {
            name: 'skill',
            in: 'query',

            description:
              'Search across Applicant technical skill fields.',

            schema: {
              type: 'string',
              maxLength: 100,
            },
          },

          {
            name: 'tag',
            in: 'query',

            schema: {
              type: 'string',
              maxLength: 100,
            },
          },

          {
            name: 'hasLinkedIn',
            in: 'query',

            schema: {
              type: 'boolean',
            },
          },

          {
            name: 'hasGitHub',
            in: 'query',

            schema: {
              type: 'boolean',
            },
          },

          {
            name: 'appliedFrom',
            in: 'query',

            description:
              'Include Applicants whose first application date is on or after this date.',

            schema: {
              type: 'string',
              format: 'date',
            },
          },

          {
            name: 'appliedTo',
            in: 'query',

            description:
              'Include Applicants whose first application date is on or before this date.',

            schema: {
              type: 'string',
              format: 'date',
            },
          },

          {
            name: 'archived',
            in: 'query',

            schema: {
              type: 'string',

              enum: [
                'false',
                'true',
                'all',
              ],

              default:
                'false',
            },
          },

          {
            name: 'sortBy',
            in: 'query',

            schema: {
              type: 'string',

              enum: [
                'lastActivityAt',
                'firstAppliedAt',
                'lastAppliedAt',
                'fullName',
                'status',
                'createdAt',
                'updatedAt',
              ],

              default:
                'lastActivityAt',
            },
          },

          {
            name: 'sortOrder',
            in: 'query',

            schema: {
              type: 'string',

              enum: [
                'asc',
                'desc',
              ],

              default:
                'desc',
            },
          },

          {
            name: 'page',
            in: 'query',

            schema: {
              type: 'integer',
              minimum: 1,
              default: 1,
            },
          },

          {
            name: 'limit',
            in: 'query',

            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 200,
              default: 50,
            },
          },
        ],

        responses: {
          200:
            successResponse,

          ...errorResponses,
        },
      },
    },

    '/api/applicants/search-options': {
      get: {
        tags: ['Applicants'],

        summary:
          'Get Applicant search filter options',

        description:
          'Returns normalized distinct values used by the advanced Applicant filtering interface.',

        responses: {
          200:
            successResponse,

          ...errorResponses,
        },
      },
    },

    '/api/applicants/{id}': {
      get: {
        tags: ['Applicants'],

        summary:
          'Get one applicant',

        parameters: [
          idParameter,
        ],

        responses: {
          200:
            successResponse,

          ...errorResponses,
        },
      },
    },

    '/api/applicants/{id}/profile': {
      patch: {
        tags: ['Applicants'],

        summary:
          'Edit the current Applicant profile',

        parameters: [
          idParameter,
        ],

        requestBody: {
          required: true,

          content: {
            'application/json': {
              schema: {
                $ref:
                  '#/components/schemas/ProfileEditRequest',
              },
            },
          },
        },

        responses: {
          200:
            successResponse,

          ...errorResponses,
        },
      },
    },

    '/api/applicants/{id}/status': {
      patch: {
        tags: ['Applicants'],

        summary:
          'Change Applicant recruitment status',

        parameters: [
          idParameter,
        ],

        requestBody: {
          required: true,

          content: {
            'application/json': {
              schema: {
                $ref:
                  '#/components/schemas/StatusRequest',
              },
            },
          },
        },

        responses: {
          200:
            successResponse,

          ...errorResponses,
        },
      },
    },

    '/api/applicants/{id}/archive': {
      post: {
        tags: ['Applicants'],

        summary:
          'Archive an Applicant (soft delete)',

        parameters: [
          idParameter,
        ],

        requestBody: {
          required: false,

          content: {
            'application/json': {
              schema: {
                $ref:
                  '#/components/schemas/ArchiveRequest',
              },
            },
          },
        },

        responses: {
          200:
            successResponse,

          ...errorResponses,
        },
      },
    },

    '/api/applicants/{id}/restore': {
      post: {
        tags: ['Applicants'],

        summary:
          'Restore an archived Applicant',

        parameters: [
          idParameter,
        ],

        responses: {
          200:
            successResponse,

          ...errorResponses,
        },
      },
    },

    '/api/applicants/{id}/submissions': {
      get: {
        tags: ['Applicants'],

        summary:
          'Get immutable submission history',

        parameters: [
          idParameter,
        ],

        responses: {
          200: {
            description:
              'Immutable Applicant submission history with current-profile comparison metadata.',

            content: {
              'application/json': {
                schema: {
                  $ref:
                    '#/components/schemas/ApplicantSubmissionHistoryResponse',
                },
              },
            },
          },

          ...errorResponses,
        },
      },
    },

    '/api/applicants/{id}/approve-profile': {
      patch: {
        tags: ['Applicants'],

        summary:
          'Approve selected profile fields from a linked submission',

        parameters: [
          idParameter,
        ],

        requestBody: {
          required: true,

          content: {
            'application/json': {
              schema: {
                $ref:
                  '#/components/schemas/ApproveProfileRequest',
              },
            },
          },
        },

        responses: {
          200:
            successResponse,

          ...errorResponses,
        },
      },
    },

    '/api/applicants/{id}/submissions/{submissionId}/link':
      {
        post: {
          tags: ['Applicants'],

          summary:
            'Link an unlinked submission to this Applicant',

          parameters: [
            idParameter,
            submissionIdParameter,
          ],

          responses: {
            200:
              successResponse,

            ...errorResponses,
          },
        },
      },

    '/api/applicants/{id}/relationship-integrity':
      {
        get: {
          tags: ['Applicants'],

          summary:
            'Check Applicant/submission relationship integrity',

          parameters: [
            idParameter,
          ],

          responses: {
            200:
              successResponse,

            ...errorResponses,
          },
        },
      },
  },

  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'auth_token',

        description:
          'Existing HttpOnly OMAH authentication cookie. Sign in as Admin or Super Admin before opening Swagger.',
      },
    },

    schemas: {
      Error: {
        type: 'object',

        properties: {
          success: {
            type: 'boolean',
            example: false,
          },

          code: {
            type: 'string',

            example:
              'INVALID_OBJECT_ID',
          },

          error: {
            type: 'string',
          },
        },
      },

      ApplicantSubmissionChangedField: {
        type: 'object',

        required: [
          'label',
          'submissionPath',
          'applicantPath',
          'submittedValue',
          'currentValue',
        ],

        properties: {
          label: {
            type: 'string',
          },

          submissionPath: {
            type: 'string',
          },

          applicantPath: {
            type: 'string',
          },

          submittedValue: {},

          currentValue: {},
        },
      },

      ApplicantSubmissionComparison: {
        type: 'object',

        required: [
          'status',
          'changeCount',
          'matchedFieldCount',
          'comparedFieldCount',
          'changedFields',
          'isLatestApprovedSource',
        ],

        properties: {
          status: {
            type: 'string',

            enum: [
              'initial',
              'changed',
              'matches_current',
            ],
          },

          changeCount: {
            type: 'integer',
            minimum: 0,
          },

          matchedFieldCount: {
            type: 'integer',
            minimum: 0,
          },

          comparedFieldCount: {
            type: 'integer',
            minimum: 0,
          },

          changedFields: {
            type: 'array',

            items: {
              $ref:
                '#/components/schemas/ApplicantSubmissionChangedField',
            },
          },

          isLatestApprovedSource: {
            type: 'boolean',
          },
        },
      },

      ApplicantSubmissionHistoryItem: {
        type: 'object',

        required: [
          'submission',
          'comparison',
        ],

        properties: {
          submission: {
            type: 'object',

            description:
              'Immutable ApplicantFormSubmission record.',

            additionalProperties:
              true,
          },

          comparison: {
            $ref:
              '#/components/schemas/ApplicantSubmissionComparison',
          },
        },
      },

      ApplicantSubmissionHistorySummary: {
        type: 'object',

        required: [
          'total',
          'changed',
          'matchesCurrent',
          'initial',
        ],

        properties: {
          total: {
            type: 'integer',
            minimum: 0,
          },

          changed: {
            type: 'integer',
            minimum: 0,
          },

          matchesCurrent: {
            type: 'integer',
            minimum: 0,
          },

          initial: {
            type: 'integer',
            minimum: 0,
          },
        },
      },

      ApplicantSubmissionHistoryResponse: {
        type: 'object',

        required: [
          'success',
          'submissions',
          'history',
          'summary',
        ],

        properties: {
          success: {
            type: 'boolean',
            example: true,
          },

          submissions: {
            type: 'array',

            items: {
              type: 'object',
              additionalProperties: true,
            },
          },

          history: {
            type: 'array',

            items: {
              $ref:
                '#/components/schemas/ApplicantSubmissionHistoryItem',
            },
          },

          summary: {
            $ref:
              '#/components/schemas/ApplicantSubmissionHistorySummary',
          },
        },
      },

      ProfileEditRequest: {
        type: 'object',

        required: [
          'changes',
        ],

        properties: {
          changes: {
            type: 'object',

            additionalProperties:
              true,

            example: {
              'identity.city':
                'Beirut',

              'skills.frameworks':
                [
                  'React',
                  'Node.js',
                ],
            },
          },
        },
      },

      StatusRequest: {
        type: 'object',

        required: [
          'status',
        ],

        properties: {
          status: {
            type: 'string',

            enum: [
              'applied',
              'reviewed',
              'interview',
              'hired',
              'rejected',
            ],
          },
        },
      },

      ArchiveRequest: {
        type: 'object',

        properties: {
          reason: {
            type: 'string',
          },
        },
      },

      ApproveProfileRequest: {
        type: 'object',

        required: [
          'submissionId',
          'fields',
        ],

        properties: {
          submissionId: {
            type: 'string',
          },

          fields: {
            type: 'array',

            minItems: 1,

            items: {
              type: 'string',
            },
          },
        },
      },
    },

    responses: {
      BadRequest: {
        description:
          'Invalid request',

        content: {
          'application/json': {
            schema: {
              $ref:
                '#/components/schemas/Error',
            },
          },
        },
      },

      Unauthorized: {
        description:
          'Not authenticated',

        content: {
          'application/json': {
            schema: {
              $ref:
                '#/components/schemas/Error',
            },
          },
        },
      },

      Forbidden: {
        description:
          'Applicant permission denied',

        content: {
          'application/json': {
            schema: {
              $ref:
                '#/components/schemas/Error',
            },
          },
        },
      },

      NotFound: {
        description:
          'Resource not found',

        content: {
          'application/json': {
            schema: {
              $ref:
                '#/components/schemas/Error',
            },
          },
        },
      },

      Conflict: {
        description:
          'Lifecycle, status, or relationship conflict',

        content: {
          'application/json': {
            schema: {
              $ref:
                '#/components/schemas/Error',
            },
          },
        },
      },

      InternalError: {
        description:
          'Unexpected server error',

        content: {
          'application/json': {
            schema: {
              $ref:
                '#/components/schemas/Error',
            },
          },
        },
      },
    },
  },
};

