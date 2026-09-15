'use strict';

const applicantInterviewSwagger =
  require('./applicantInterviewSwagger');

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

const evaluationIdParameter = {
  name: 'evaluationId',
  in: 'path',
  required: true,

  schema: {
    type: 'string',
  },

  description:
    'ApplicantEvaluation MongoDB ObjectId',
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
    ...applicantInterviewSwagger.paths,
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

    '/api/applicants/{id}/activity': {
      get: {
        tags: [
          'Applicants',
        ],

        summary:
          'Get Applicant activity timeline',

        description:
          'Returns a unified reverse-chronological timeline combining historical submissions, evaluations, interviews, and stored Applicant activity events.',

        parameters: [
          idParameter,

          {
            in: 'query',
            name: 'category',

            schema: {
              type: 'string',
            },

            description:
              'Optional activity category filter.',
          },

          {
            in: 'query',
            name: 'type',

            schema: {
              type: 'string',
            },

            description:
              'Optional exact activity event type filter.',
          },

          {
            in: 'query',
            name: 'limit',

            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 500,
              default: 100,
            },
          },
        ],

        responses: {
          200: {
            description:
              'Applicant activity timeline',
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


    '/api/applicants/communications/providers': {
      get: {
        tags: [
          'Applicants',
        ],

        summary:
          'Get Applicant communication provider status',

        description:
          'Returns safe runtime readiness information for Applicant email and WhatsApp communication providers. No credentials, access tokens, passwords, or provider identifiers are exposed.',

        responses: {
          200: {
            description:
              'Communication provider readiness status',
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


    '/api/applicants/{id}/communications/email': {
      post: {
        tags: [
          'Applicants',
        ],

        summary:
          'Send an email to an Applicant',

        description:
          'Sends an email to the address stored on the Applicant master profile. The recipient email cannot be supplied by the client.',

        parameters: [
          idParameter,
        ],

        requestBody: {
          required: true,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                required: [
                  'subject',
                  'body',
                ],

                properties: {
                  subject: {
                    type:
                      'string',

                    minLength:
                      1,
                  },

                  body: {
                    type:
                      'string',

                    minLength:
                      1,
                  },
                },
              },
            },
          },
        },

        responses: {
          200: {
            description:
              'Email sent successfully',
          },

          400: {
            description:
              'Invalid email communication request',
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

          503: {
            description:
              'Email delivery provider is not configured or unavailable',
          },

          500: {
            $ref:
              '#/components/responses/InternalError',
          },
        },
      },
    },


    '/api/applicants/{id}/communications/whatsapp': {
      post: {
        tags: [
          'Applicants',
        ],

        summary:
          'Send a WhatsApp message to an Applicant',

        description:
          'Sends a WhatsApp message through the configured WhatsApp Business provider. The recipient number is resolved from the Applicant master profile and cannot be supplied by the client.',

        parameters: [
          idParameter,
        ],

        requestBody: {
          required: true,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                required: [
                  'message',
                ],

                properties: {
                  message: {
                    type:
                      'string',

                    minLength:
                      1,
                  },
                },
              },
            },
          },
        },

        responses: {
          200: {
            description:
              'WhatsApp message accepted by the configured provider',
          },

          400: {
            description:
              'Invalid WhatsApp communication request',
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

          502: {
            description:
              'WhatsApp provider rejected the request or could not be reached',
          },

          503: {
            description:
              'WhatsApp delivery is disabled or not configured',
          },

          500: {
            $ref:
              '#/components/responses/InternalError',
          },
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

    '/api/applicants/{id}/evaluations': {
      get: {
        tags: ['Applicants'],

        summary:
          'List Applicant evaluations',

        description:
          'Returns recruiter evaluation history for this Applicant, newest first.',

        parameters: [
          idParameter,
        ],

        responses: {
          200: {
            description:
              'Applicant evaluations',

            content: {
              'application/json': {
                schema: {
                  $ref:
                    '#/components/schemas/ApplicantEvaluationListResponse',
                },
              },
            },
          },

          ...errorResponses,
        },
      },

      post: {
        tags: ['Applicants'],

        summary:
          'Create an Applicant evaluation',

        description:
          'Creates a recruiter evaluation for one linked Applicant submission. Evaluator identity and calculated scores are controlled by the server.',

        parameters: [
          idParameter,
        ],

        requestBody: {
          required: true,

          content: {
            'application/json': {
              schema: {
                $ref:
                  '#/components/schemas/ApplicantEvaluationCreateRequest',
              },
            },
          },
        },

        responses: {
          201: {
            description:
              'Evaluation created',

            content: {
              'application/json': {
                schema: {
                  $ref:
                    '#/components/schemas/ApplicantEvaluationCreateResponse',
                },
              },
            },
          },

          ...errorResponses,
        },
      },
    },


    '/api/applicants/{id}/evaluations/{evaluationId}':
      {
        patch: {
          tags: ['Applicants'],

          summary:
            'Update an Applicant evaluation draft',

          description:
            'Updates an evaluation owned by the authenticated evaluator. Submitted evaluations are immutable.',

          parameters: [
            idParameter,
            evaluationIdParameter,
          ],

          requestBody: {
            required: true,

            content: {
              'application/json': {
                schema: {
                  $ref:
                    '#/components/schemas/ApplicantEvaluationUpdateRequest',
                },
              },
            },
          },

          responses: {
            200: {
              description:
                'Evaluation draft updated',

              content: {
                'application/json': {
                  schema: {
                    $ref:
                      '#/components/schemas/ApplicantEvaluationMutationResponse',
                  },
                },
              },
            },

            ...errorResponses,
          },
        },


        delete: {
          tags: ['Applicants'],

          summary:
            'Delete an Applicant evaluation from active history',

          description:
            'Soft-archives the evaluation. The database record is retained for audit history and is never hard-deleted.',

          parameters: [
            idParameter,
            evaluationIdParameter,
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
            200: {
              description:
                'Evaluation archived',

              content: {
                'application/json': {
                  schema: {
                    $ref:
                      '#/components/schemas/ApplicantEvaluationMutationResponse',
                  },
                },
              },
            },

            ...errorResponses,
          },
        },
},


    '/api/applicants/{id}/evaluations/{evaluationId}/submit':
      {
        post: {
          tags: ['Applicants'],

          summary:
            'Submit an Applicant evaluation',

          description:
            'Transitions an evaluation from draft to submitted. Submitted evaluations cannot later be edited.',

          parameters: [
            idParameter,
            evaluationIdParameter,
          ],

          responses: {
            200: {
              description:
                'Evaluation submitted',

              content: {
                'application/json': {
                  schema: {
                    $ref:
                      '#/components/schemas/ApplicantEvaluationMutationResponse',
                  },
                },
              },
            },

            ...errorResponses,
          },
        },
      },


    '/api/applicants/{id}/evaluations/{evaluationId}/reopen':
      {
        post: {
          tags: ['Applicants'],

          summary:
            'Reopen a submitted Applicant evaluation',

          description:
            'Transitions an evaluation from submitted back to draft so its original evaluator can edit it.',

          parameters: [
            idParameter,
            evaluationIdParameter,
          ],

          responses: {
            200: {
              description:
                'Evaluation reopened as draft',

              content: {
                'application/json': {
                  schema: {
                    $ref:
                      '#/components/schemas/ApplicantEvaluationMutationResponse',
                  },
                },
              },
            },

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

      ApplicantEvaluationCriteria: {
        type: 'object',

        required: [
          'technicalFit',
          'relevantExperience',
          'communication',
          'motivationCommitment',
          'learningPotential',
        ],

        additionalProperties:
          false,

        properties: {
          technicalFit: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
          },

          relevantExperience: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
          },

          communication: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
          },

          motivationCommitment: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
          },

          learningPotential: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
          },
        },
      },


      ApplicantEvaluationEvaluator: {
        type: 'object',

        required: [
          'userId',
          'name',
          'role',
        ],

        properties: {
          userId: {
            type: 'string',
          },

          name: {
            type: 'string',
          },

          role: {
            type: 'string',
          },
        },
      },


      ApplicantEvaluation: {
        type: 'object',

        required: [
          '_id',
          'applicantId',
          'submissionId',
          'evaluator',
          'criteria',
          'averageRating',
          'weightedScore',
          'recommendation',
          'status',
        ],

        properties: {
          _id: {
            type: 'string',
          },

          applicantId: {
            type: 'string',
          },

          submissionId: {
            type: 'string',
          },

          evaluator: {
            $ref:
              '#/components/schemas/ApplicantEvaluationEvaluator',
          },

          criteria: {
            $ref:
              '#/components/schemas/ApplicantEvaluationCriteria',
          },

          averageRating: {
            type: 'number',
            minimum: 1,
            maximum: 5,
          },

          weightedScore: {
            type: 'number',
            minimum: 0,
            maximum: 100,
          },

          recommendation: {
            type: 'string',

            enum: [
              'strong_yes',
              'yes',
              'hold',
              'no',
              'strong_no',
            ],
          },

          strengths: {
            type: 'string',
          },

          concerns: {
            type: 'string',
          },

          summary: {
            type: 'string',
          },

          status: {
            type: 'string',

            enum: [
              'draft',
              'submitted',
            ],
          },

          submittedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },

          reopenedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },

          reopenedBy: {
            type: 'string',
          },

          archived: {
            type: 'boolean',
          },

          archivedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },

          archivedBy: {
            type: 'string',
          },

          archiveReason: {
            type: 'string',
          },

          createdAt: {
            type: 'string',
            format: 'date-time',
          },

          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },


      ApplicantEvaluationCreateRequest: {
        type: 'object',

        required: [
          'submissionId',
          'criteria',
          'recommendation',
        ],

        additionalProperties:
          false,

        properties: {
          submissionId: {
            type: 'string',
          },

          criteria: {
            $ref:
              '#/components/schemas/ApplicantEvaluationCriteria',
          },

          recommendation: {
            type: 'string',

            enum: [
              'strong_yes',
              'yes',
              'hold',
              'no',
              'strong_no',
            ],
          },

          strengths: {
            type: 'string',
          },

          concerns: {
            type: 'string',
          },

          summary: {
            type: 'string',
          },

          status: {
            type: 'string',

            enum: [
              'draft',
              'submitted',
            ],

            default:
              'draft',
          },
        },
      },


      ApplicantEvaluationUpdateRequest: {
        type: 'object',

        required: [
          'criteria',
          'recommendation',
        ],

        additionalProperties:
          false,

        properties: {
          criteria: {
            $ref:
              '#/components/schemas/ApplicantEvaluationCriteria',
          },

          recommendation: {
            type: 'string',

            enum: [
              'strong_yes',
              'yes',
              'hold',
              'no',
              'strong_no',
            ],
          },

          strengths: {
            type: 'string',
          },

          concerns: {
            type: 'string',
          },

          summary: {
            type: 'string',
          },
        },
      },


      ApplicantEvaluationListResponse: {
        type: 'object',

        required: [
          'success',
          'evaluations',
        ],

        properties: {
          success: {
            type: 'boolean',
            example: true,
          },

          evaluations: {
            type: 'array',

            items: {
              $ref:
                '#/components/schemas/ApplicantEvaluation',
            },
          },
        },
      },


      ApplicantEvaluationCreateResponse: {
        type: 'object',

        required: [
          'success',
          'evaluation',
        ],

        properties: {
          success: {
            type: 'boolean',
            example: true,
          },

          evaluation: {
            $ref:
              '#/components/schemas/ApplicantEvaluation',
          },
        },
      },


      ApplicantEvaluationMutationResponse: {
        type: 'object',

        required: [
          'success',
          'result',
        ],

        properties: {
          success: {
            type: 'boolean',
            example: true,
          },

          result: {
            type: 'object',
            additionalProperties: true,
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

