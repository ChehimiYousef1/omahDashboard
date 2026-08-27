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
    '/api/applicants': {
      get: {
        tags: ['Applicants'],

        summary:
          'List applicants',

        parameters: [
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
          200:
            successResponse,

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

