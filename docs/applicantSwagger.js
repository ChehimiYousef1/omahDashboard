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

    '/api/applicants/documents/library': {
      get: {
        tags: [
          'Applicants',
        ],

        summary:
          'Get centralized Applicant document library',

        description:
          'Returns a read-only paginated inventory combining managed Applicant documents and immutable Form-submission documents for the current Applicant cohort. Managed document mutation continues to use the dedicated protected Applicant Document APIs.',

        parameters: [
          {
            in: 'query',
            name: 'q',
            schema: {
              type: 'string',
            },
            description:
              'Applicant search text.',
          },

          {
            in: 'query',
            name: 'from',
            schema: {
              type: 'string',
              format: 'date',
            },
          },

          {
            in: 'query',
            name: 'to',
            schema: {
              type: 'string',
              format: 'date',
            },
          },

          {
            in: 'query',
            name: 'status',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'positionTrack',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'positionType',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'country',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'city',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'source',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'skill',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'tag',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'archived',
            schema: {
              type: 'string',
              enum: [
                'false',
                'true',
                'all',
              ],
              default: 'false',
            },
          },

          {
            in: 'query',
            name: 'origin',
            schema: {
              type: 'string',
              enum: [
                'all',
                'managed',
                'form_submission',
              ],
              default: 'all',
            },
          },

          {
            in: 'query',
            name: 'category',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'state',
            schema: {
              type: 'string',
              enum: [
                'current',
                'historical',
                'archived',
                'all',
              ],
              default: 'current',
            },
          },

          {
            in: 'query',
            name: 'fileQ',
            schema: {
              type: 'string',
            },
            description:
              'Search document title, filename, category or managed source.',
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


    '/api/applicants/analytics/drilldown': {
      get: {
        tags: [
          'Applicants',
        ],

        summary:
          'Get exact Applicant analytics drill-down',

        description:
          'Returns read-only exact operational Applicant or duplicate-case rows for a selected analytics condition. The endpoint uses the same Applicant cohort filters as the main Applicant analytics endpoint.',

        parameters: [
          {
            in: 'query',
            name: 'type',
            required: true,
            schema: {
              type: 'string',
              enum: [
                'missing_cv',
                'incomplete_profile',
                'draft_evaluation',
                'no_show',
                'overdue_interview',
                'no_submitted_evaluation',
                'no_interview',
                'high_confidence_duplicate',
              ],
            },
          },

          {
            in: 'query',
            name: 'q',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'from',
            schema: {
              type: 'string',
              format: 'date',
            },
          },

          {
            in: 'query',
            name: 'to',
            schema: {
              type: 'string',
              format: 'date',
            },
          },

          {
            in: 'query',
            name: 'status',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'positionTrack',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'positionType',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'country',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'city',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'source',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'skill',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'tag',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'archived',
            schema: {
              type: 'string',
              enum: [
                'false',
                'true',
                'all',
              ],
              default: 'false',
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


    '/api/applicants/analytics': {
      get: {
        tags: [
          'Applicants',
        ],

        summary:
          'Get Applicant recruitment analytics',

        description:
          'Returns professional server-side recruitment analytics including executive KPIs, all seven Applicant pipeline stages, current pipeline funnel data, recorded status-transition flow, Applicant trends, sources, evaluation averages and histograms, five evaluation criteria, interview status/outcome/type/format analytics, geography, education, skills, position segmentation, and cross-tab matrices. Historical time-in-stage and full historical conversion rates are intentionally excluded because legacy status-transition history is incomplete.',

        parameters: [
          {
            in: 'query',
            name: 'from',
            schema: {
              type: 'string',
              format: 'date',
            },
          },

          {
            in: 'query',
            name: 'to',
            schema: {
              type: 'string',
              format: 'date',
            },
          },

          {
            in: 'query',
            name: 'status',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'positionTrack',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'source',
            schema: {
              type: 'string',
            },
          },

          {
            in: 'query',
            name: 'archived',
            schema: {
              type: 'string',
              enum: [
                'false',
                'true',
                'all',
              ],
              default: 'false',
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


    '/api/applicants/pipeline': {
      get: {
        tags: [
          'Applicants',
        ],

        summary:
          'Get Applicant recruitment pipeline',

        description:
          'Returns the canonical Applicant pipeline stages, business-facing labels, stage order, terminal flags, and allowed transitions.',

        responses: {
          200: {
            description:
              'Applicant recruitment pipeline definition',
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


    '/api/applicants/calendar/events': {
      get: {
        tags: ['Applicants'],

        summary:
          'List unified Applicant Calendar events',

        description:
          'Read-only Calendar aggregation for Applicant interviews, internal tasks, scheduled notes, and reminders. Opening or refreshing this endpoint never writes to Google Calendar.',

        parameters: [
          {
            name:
              'from',

            in:
              'query',

            required:
              true,

            schema: {
              type:
                'string',

              format:
                'date-time',
            },
          },

          {
            name:
              'to',

            in:
              'query',

            required:
              true,

            schema: {
              type:
                'string',

              format:
                'date-time',
            },
          },

          {
            name:
              'sourceTypes',

            in:
              'query',

            required:
              false,

            description:
              'Comma-separated interview, task, scheduled_note, reminder filters.',

            schema: {
              type:
                'string',
            },
          },

          {
            name:
              'statuses',

            in:
              'query',

            required:
              false,

            schema: {
              type:
                'string',
            },
          },

          {
            name:
              'syncStatuses',

            in:
              'query',

            required:
              false,

            schema: {
              type:
                'string',
            },
          },

          {
            name:
              'owner',

            in:
              'query',

            required:
              false,

            schema: {
              type:
                'string',
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

    '/api/applicants/{id}/audit': {
      get: {
        tags: [
          'Applicant Audit & History',
        ],

        summary:
          'Get Applicant audit and change history',

        description:
          'Returns paginated, reverse-chronological Applicant audit events including actor snapshots, action/category, source context, and structured before/after changes where available. Historical ApplicantActivity records remain supported without rewriting existing data.',

        /*
         * Authentication is inherited from the
         * global OpenAPI cookieAuth requirement.
         */

        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,

            schema: {
              type: 'string',
            },
          },

          {
            name: 'category',
            in: 'query',
            required: false,

            description:
              'Optional Applicant activity category.',

            schema: {
              type: 'string',
            },
          },

          {
            name: 'action',
            in: 'query',
            required: false,

            description:
              'Optional exact audited action/event type.',

            schema: {
              type: 'string',
            },
          },

          {
            name: 'actorId',
            in: 'query',
            required: false,

            description:
              'Optional user ID that performed the action.',

            schema: {
              type: 'string',
            },
          },

          {
            name: 'from',
            in: 'query',
            required: false,

            description:
              'Optional inclusive audit start date/time.',

            schema: {
              type: 'string',
              format: 'date-time',
            },
          },

          {
            name: 'to',
            in: 'query',
            required: false,

            description:
              'Optional inclusive audit end date/time.',

            schema: {
              type: 'string',
              format: 'date-time',
            },
          },

          {
            name: 'page',
            in: 'query',
            required: false,

            schema: {
              type: 'integer',
              minimum: 1,
              default: 1,
            },
          },

          {
            name: 'limit',
            in: 'query',
            required: false,

            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
          },
        ],

        responses: {
          200: {
            description:
              'Applicant audit and change history',

            content: {
              'application/json': {
                schema: {
                  type: 'object',

                  properties: {
                    success: {
                      type: 'boolean',
                      example: true,
                    },

                    events: {
                      type: 'array',

                      items: {
                        type: 'object',

                        properties: {
                          id: {
                            type: 'string',
                          },

                          action: {
                            type: 'string',
                          },

                          category: {
                            type: 'string',
                          },

                          title: {
                            type: 'string',
                          },

                          description: {
                            type: 'string',
                          },

                          occurredAt: {
                            type: 'string',
                            format: 'date-time',
                          },

                          recordedAt: {
                            type: 'string',
                            format: 'date-time',
                          },

                          actor: {
                            type: 'object',
                          },

                          source: {
                            type: 'object',
                          },

                          changes: {
                            type: 'array',

                            items: {
                              type: 'object',

                              properties: {
                                field: {
                                  type: 'string',
                                },

                                label: {
                                  type: 'string',
                                },

                                before: {},

                                after: {},
                              },
                            },
                          },

                          details: {
                            type: 'object',
                          },

                          auditVersion: {
                            type: 'integer',
                          },
                        },
                      },
                    },

                    total: {
                      type: 'integer',
                    },

                    page: {
                      type: 'integer',
                    },

                    limit: {
                      type: 'integer',
                    },

                    pages: {
                      type: 'integer',
                    },

                    filters: {
                      type: 'object',
                    },
                  },
                },
              },
            },
          },

          400: {
            description:
              'Invalid audit filter or date range.',
          },

          401: {
            description:
              'Not authenticated.',
          },

          403: {
            description:
              'Applicant access denied.',
          },

          500: {
            $ref:
              '#/components/responses/InternalError',
          },
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

    '/api/applicants/{id}/permanent': {
      delete: {
        tags: ['Applicants'],

        summary:
          'Permanently delete an archived Applicant',

        description:
          'Permanently removes the archived Applicant and Applicant-owned operational records. Immutable Form submissions remain preserved with their historical Applicant reference. Active interviews or active provider meetings block deletion.',

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
                  'confirmation',
                ],

                properties: {
                  confirmation: {
                    type:
                      'string',

                    enum: [
                      'DELETE',
                    ],
                  },
                },
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


    '/api/applicants/{id}/notes': {
      get: {
        tags: ['Applicants'],

        summary:
          'List internal Applicant notes and tasks',

        description:
          'Returns recruitment-only notes/tasks. Archived items are excluded unless includeArchived=true.',

        parameters: [
          idParameter,

          {
            name:
              'includeArchived',

            in:
              'query',

            required:
              false,

            schema: {
              type:
                'boolean',
            },
          },
        ],

        responses: {
          200:
            successResponse,

          ...errorResponses,
        },
      },

      post: {
        tags: ['Applicants'],

        summary:
          'Create an internal Applicant note or task',

        description:
          'Creates recruitment-only information. Scheduling fields are internal and do not create a Calendar event.',

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
                  'content',
                ],

                properties: {
                  content: {
                    type:
                      'string',

                    maxLength:
                      4000,
                  },

                  kind: {
                    type:
                      'string',

                    enum: [
                      'note',
                      'task',
                    ],

                    default:
                      'note',
                  },

                  important: {
                    type:
                      'boolean',

                    default:
                      false,
                  },

                  priority: {
                    type:
                      'string',

                    enum: [
                      '',
                      'low',
                      'medium',
                      'high',
                      'urgent',
                    ],

                    default:
                      '',

                    description:
                      'Optional recruitment task priority. Applies only when kind is task.',
                  },

                  assigneeUserId: {
                    type:
                      'string',

                    default:
                      '',

                    description:
                      'Optional trusted active OMAH Recruiter, Admin, or Super Admin user ID. Applies only when kind is task.',
                  },

                  schedule: {
                    type:
                      'object',

                    properties: {
                      startAt: {
                        type:
                          'string',

                        format:
                          'date-time',

                        nullable:
                          true,
                      },

                      endAt: {
                        type:
                          'string',

                        format:
                          'date-time',

                        nullable:
                          true,
                      },

                      reminderAt: {
                        type:
                          'string',

                        format:
                          'date-time',

                        nullable:
                          true,
                      },

                      reminderNote: {
                        type:
                          'string',

                        maxLength:
                          1000,
                      },
                    },
                  },
                },
              },
            },
          },
        },

        responses: {
          201:
            successResponse,

          ...errorResponses,
        },
      },
    },


    '/api/applicants/{id}/notes/{noteId}': {
      patch: {
        tags: ['Applicants'],

        summary:
          'Edit an internal Applicant note or task',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
            },
          },
        ],

        requestBody: {
          required:
            true,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                required: [
                  'content',
                ],

                properties: {
                  content: {
                    type:
                      'string',

                    maxLength:
                      4000,
                  },
                },
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

      delete: {
        tags: ['Applicants'],

        summary:
          'Legacy soft-archive an internal note',

        description:
          'Retained temporarily for compatibility with the existing Notes UI. The dedicated archive endpoint should be used by the new Notes/Tasks interface.',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
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


    '/api/applicants/{id}/notes/{noteId}/archive': {
      post: {
        tags: ['Applicants'],

        summary:
          'Archive an internal note or task',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
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


    '/api/applicants/{id}/notes/{noteId}/restore': {
      post: {
        tags: ['Applicants'],

        summary:
          'Restore an archived internal note or task',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
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


    '/api/applicants/{id}/notes/{noteId}/permanent': {
      delete: {
        tags: ['Applicants'],

        summary:
          'Permanently delete an archived internal note or task',

        description:
          'The item must already be archived and confirmation must exactly equal DELETE. Dependent replies are removed by the service layer.',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
            },
          },
        ],

        requestBody: {
          required:
            true,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                required: [
                  'confirmation',
                ],

                properties: {
                  confirmation: {
                    type:
                      'string',

                    enum: [
                      'DELETE',
                    ],
                  },
                },
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


    '/api/applicants/{id}/notes/{noteId}/importance': {
      patch: {
        tags: ['Applicants'],

        summary:
          'Mark an internal note/task important or normal',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
            },
          },
        ],

        requestBody: {
          required:
            true,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                required: [
                  'important',
                ],

                properties: {
                  important: {
                    type:
                      'boolean',
                  },
                },
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


    '/api/applicants/{id}/notes/{noteId}/like': {
      patch: {
        tags: ['Applicants'],

        summary:
          'Like or unlike an internal note/task',

        description:
          'Stores the authenticated user ID as a per-user reaction.',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
            },
          },
        ],

        requestBody: {
          required:
            true,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                required: [
                  'liked',
                ],

                properties: {
                  liked: {
                    type:
                      'boolean',
                  },
                },
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


    '/api/applicants/{id}/notes/{noteId}/star': {
      patch: {
        tags: ['Applicants'],

        summary:
          'Star or unstar an internal note/task',

        description:
          'Stores personal bookmark state for the authenticated user.',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
            },
          },
        ],

        requestBody: {
          required:
            true,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                required: [
                  'starred',
                ],

                properties: {
                  starred: {
                    type:
                      'boolean',
                  },
                },
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


    '/api/applicants/{id}/notes/{noteId}/task-assignee': {
      patch: {
        tags: ['Applicants'],

        summary:
          'Assign or unassign a recruitment task',

        description:
          'Assigns an internal recruitment task to an explicitly enabled active OMAH task-assignee account. The server resolves assigneeUserId against the trusted user directory and rejects accounts that are not enabled for Applicant task assignment. An empty assigneeUserId explicitly unassigns the task.',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
            },
          },
        ],

        requestBody: {
          required:
            true,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                required: [
                  'assigneeUserId',
                ],

                properties: {
                  assigneeUserId: {
                    type:
                      'string',

                    description:
                      'Trusted OMAH user ID. Send an empty string to unassign the task.',

                    example:
                      'admin-1',
                  },
                },
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


    '/api/applicants/{id}/notes/{noteId}/task-priority': {
      patch: {
        tags: ['Applicants'],

        summary:
          'Update recruitment task priority',

        description:
          'Updates the explicit priority of an active internal recruitment task. Send an empty string to clear the explicit priority.',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
            },
          },
        ],

        requestBody: {
          required:
            true,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                required: [
                  'priority',
                ],

                properties: {
                  priority: {
                    type:
                      'string',

                    enum: [
                      '',
                      'low',
                      'medium',
                      'high',
                      'urgent',
                    ],

                    description:
                      'Recruitment task priority. Empty string clears explicit priority.',
                  },
                },
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


    '/api/applicants/{id}/notes/{noteId}/task-status': {
      patch: {
        tags: ['Applicants'],

        summary:
          'Update recruitment task workflow status',

        description:
          'Updates an active internal recruitment task to todo, in_progress, completed, or cancelled. Overdue is derived from the task due date and is not stored as a task status.',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
            },
          },
        ],

        requestBody: {
          required:
            true,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                required: [
                  'taskStatus',
                ],

                properties: {
                  taskStatus: {
                    type:
                      'string',

                    enum: [
                      'todo',
                      'in_progress',
                      'completed',
                      'cancelled',
                    ],
                  },
                },
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


    '/api/applicants/{id}/notes/{noteId}/schedule': {
      patch: {
        tags: ['Applicants'],

        summary:
          'Update internal task dates or reminder',

        description:
          'Stores start/end/reminder information internally. This endpoint does not create, update, or delete Google Calendar events.',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
            },
          },
        ],

        requestBody: {
          required:
            true,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                required: [
                  'schedule',
                ],

                properties: {
                  schedule: {
                    type:
                      'object',

                    properties: {
                      startAt: {
                        type:
                          'string',

                        format:
                          'date-time',

                        nullable:
                          true,
                      },

                      endAt: {
                        type:
                          'string',

                        format:
                          'date-time',

                        nullable:
                          true,
                      },

                      reminderAt: {
                        type:
                          'string',

                        format:
                          'date-time',

                        nullable:
                          true,
                      },

                      reminderNote: {
                        type:
                          'string',

                        maxLength:
                          1000,
                      },
                    },
                  },
                },
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


    '/api/applicants/{id}/notes/{noteId}/calendar': {
      post: {
        tags: ['Applicants'],

        summary:
          'Add an internal note/task to Google Calendar',

        description:
          'Explicit external synchronization. Requires a valid Start and End/Due date-time. This action creates a Google Calendar event only when deliberately called; saving the note/task itself never creates an event.',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
            },
          },
        ],

        requestBody: {
          required:
            false,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                properties: {
                  timezone: {
                    type:
                      'string',

                    example:
                      'Asia/Beirut',
                  },
                },
              },
            },
          },
        },

        responses: {
          201:
            successResponse,

          ...errorResponses,
        },
      },


      patch: {
        tags: ['Applicants'],

        summary:
          'Update an internal note/task Google Calendar event',

        description:
          'Explicitly updates the existing linked Google Calendar event. Local edits only mark the Calendar state as not_synced; they do not update Google automatically.',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
            },
          },
        ],

        requestBody: {
          required:
            false,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                properties: {
                  timezone: {
                    type:
                      'string',

                    example:
                      'Asia/Beirut',
                  },
                },
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


      delete: {
        tags: ['Applicants'],

        summary:
          'Remove an internal note/task from Google Calendar',

        description:
          'Explicitly deletes the linked Google Calendar event and clears the local Calendar link. This cleanup action may also be used for archived records before permanent deletion.',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
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


    '/api/applicants/{id}/notes/{noteId}/replies': {
      get: {
        tags: ['Applicants'],

        summary:
          'List replies for an internal note/task',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
            },
          },

          {
            name:
              'includeArchived',

            in:
              'query',

            required:
              false,

            schema: {
              type:
                'boolean',
            },
          },
        ],

        responses: {
          200:
            successResponse,

          ...errorResponses,
        },
      },

      post: {
        tags: ['Applicants'],

        summary:
          'Reply to an internal note/task',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
            },
          },
        ],

        requestBody: {
          required:
            true,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                required: [
                  'content',
                ],

                properties: {
                  content: {
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
          201:
            successResponse,

          ...errorResponses,
        },
      },
    },


    '/api/applicants/{id}/notes/{noteId}/replies/{replyId}': {
      patch: {
        tags: ['Applicants'],

        summary:
          'Edit an internal note/task reply',

        parameters: [
          idParameter,

          {
            name:
              'noteId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
            },
          },

          {
            name:
              'replyId',

            in:
              'path',

            required:
              true,

            schema: {
              type:
                'string',
            },
          },
        ],

        requestBody: {
          required:
            true,

          content: {
            'application/json': {
              schema: {
                type:
                  'object',

                required: [
                  'content',
                ],

                properties: {
                  content: {
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
          200:
            successResponse,

          ...errorResponses,
        },
      },
    },


    '/api/applicants/{id}/notes/{noteId}/replies/{replyId}/archive':
      {
        post: {
          tags: ['Applicants'],

          summary:
            'Archive an internal reply',

          parameters: [
            idParameter,

            {
              name:
                'noteId',

              in:
                'path',

              required:
                true,

              schema: {
                type:
                  'string',
              },
            },

            {
              name:
                'replyId',

              in:
                'path',

              required:
                true,

              schema: {
                type:
                  'string',
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


    '/api/applicants/{id}/notes/{noteId}/replies/{replyId}/restore':
      {
        post: {
          tags: ['Applicants'],

          summary:
            'Restore an archived internal reply',

          parameters: [
            idParameter,

            {
              name:
                'noteId',

              in:
                'path',

              required:
                true,

              schema: {
                type:
                  'string',
              },
            },

            {
              name:
                'replyId',

              in:
                'path',

              required:
                true,

              schema: {
                type:
                  'string',
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


    '/api/applicants/{id}/notes/{noteId}/replies/{replyId}/permanent':
      {
        delete: {
          tags: ['Applicants'],

          summary:
            'Permanently delete an archived internal reply',

          description:
            'The reply must already be archived and confirmation must exactly equal DELETE.',

          parameters: [
            idParameter,

            {
              name:
                'noteId',

              in:
                'path',

              required:
                true,

              schema: {
                type:
                  'string',
              },
            },

            {
              name:
                'replyId',

              in:
                'path',

              required:
                true,

              schema: {
                type:
                  'string',
              },
            },
          ],

          requestBody: {
            required:
              true,

            content: {
              'application/json': {
                schema: {
                  type:
                    'object',

                  required: [
                    'confirmation',
                  ],

                  properties: {
                    confirmation: {
                      type:
                        'string',

                      enum: [
                        'DELETE',
                      ],
                    },
                  },
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


    '/api/applicants/{id}/tags': {
      put: {
        tags: ['Applicants'],

        summary:
          'Replace Applicant categorization tags',

        description:
          'Updates the existing recruitment.tags collection used by Applicant search, filtering, segmentation, and analytics.',

        parameters: [
          idParameter,
        ],

        requestBody: {
          required: true,

          content: {
            'application/json': {
              schema: {
                type: 'object',

                required: [
                  'tags',
                ],

                properties: {
                  tags: {
                    type: 'array',
                    maxItems: 20,

                    items: {
                      type: 'string',
                      maxLength: 40,
                    },
                  },
                },
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



/*
|--------------------------------------------------------------------------
| APPLICANT_SWAGGER_SECTION_GROUPING
|--------------------------------------------------------------------------
|
| Swagger presentation only.
|
| This block does NOT change:
|
| - Express routes
| - HTTP methods
| - API URLs
| - RBAC
| - MongoDB behavior
| - frontend API calls
|
| It assigns each documented operation to a focused Swagger section so the
| Applicant API is easier to navigate and understand.
|
*/

const APPLICANT_SWAGGER_SECTION_TAGS = [
  {
    name:
      'Applicant Core',

    description:
      'Applicant master profile, activity timeline, recruitment status, archive/restore lifecycle, and permanent deletion.'
  },

  {
    name:
      'Applicant Audit & History',

    description:
      'Immutable Applicant audit trail showing who changed what and when, with actor snapshots and structured before/after values where available.'
  },

  {
    name:
      'Applicant Search & Analytics',

    description:
      'Applicant search, filtering, recruitment pipeline, analytics dashboards, and drill-down data.'
  },

  {
    name:
      'Applicant Duplicate Review',

    description:
      'Review and resolve potential duplicate Applicant records.'
  },

  {
    name:
      'Applicant Interviews',

    description:
      'Interview availability, scheduling, rescheduling, completion, cancellation, no-show handling, archive, and permanent deletion.'
  },

  {
    name:
      'Applicant Calendar',

    description:
      'Unified read-only Applicant Calendar aggregation across interviews, tasks, scheduled notes, and reminders.'
  },

  {
    name:
      'Applicant Communications',

    description:
      'Applicant communication provider status and outbound email or WhatsApp operations.'
  },

  {
    name:
      'Applicant Notes & Tasks',

    description:
      'Internal notes, recruitment tasks, assignees, priorities, workflow state, reminders, scheduling, and explicit Google Calendar synchronization.'
  },

  {
    name:
      'Applicant Replies',

    description:
      'Threaded replies attached to internal Applicant notes and recruitment tasks.'
  },

  {
    name:
      'Applicant Tags',

    description:
      'Applicant categorization and recruitment tags.'
  },

  {
    name:
      'Applicant Submissions',

    description:
      'Immutable application submissions, profile approval, submission linking, and Applicant/submission relationship integrity.'
  },

  {
    name:
      'Applicant Evaluations',

    description:
      'Applicant evaluation creation, editing, submission, reopening, and evaluation history.'
  }
];


function resolveApplicantSwaggerSection(
  path,
  method
) {
  /*
   * Audit & Change History.
   */
  if (
    path.endsWith(
      '/audit'
    )
  ) {
    return 'Applicant Audit & History';
  }


  /*
   * Interviews.
   */
  if (
    path.includes(
      '/interviews'
    )
  ) {
    return 'Applicant Interviews';
  }


  /*
   * Duplicate review.
   */
  if (
    path.startsWith(
      '/api/applicants/duplicates'
    )
  ) {
    return 'Applicant Duplicate Review';
  }


  /*
   * Centralized document library joins the
   * dedicated Applicant Documents Swagger
   * section supplied by applicantDocumentSwagger.
   */
  if (
    path ===
      '/api/applicants/documents/library'
  ) {
    return 'Applicant Documents';
  }


  /*
   * Search / analytics / pipeline.
   */
  if (
    path ===
      '/api/applicants' ||

    path ===
      '/api/applicants/search-options' ||

    path ===
      '/api/applicants/pipeline' ||

    path.startsWith(
      '/api/applicants/analytics'
    )
  ) {
    return 'Applicant Search & Analytics';
  }


  /*
   * Unified Calendar.
   */
  if (
    path ===
      '/api/applicants/calendar/events'
  ) {
    return 'Applicant Calendar';
  }


  /*
   * Applicant communication.
   */
  if (
    path.includes(
      '/communications/'
    )
  ) {
    return 'Applicant Communications';
  }


  /*
   * Replies must be detected BEFORE notes
   * because reply routes also contain /notes.
   */
  if (
    path.includes(
      '/notes/'
    ) &&
    path.includes(
      '/replies'
    )
  ) {
    return 'Applicant Replies';
  }


  /*
   * Notes / tasks / reminders / task Calendar.
   */
  if (
    path.includes(
      '/notes'
    )
  ) {
    return 'Applicant Notes & Tasks';
  }


  /*
   * Categorization tags.
   */
  if (
    path.endsWith(
      '/tags'
    )
  ) {
    return 'Applicant Tags';
  }


  /*
   * Evaluations.
   */
  if (
    path.includes(
      '/evaluations'
    )
  ) {
    return 'Applicant Evaluations';
  }


  /*
   * Submission history / approval / linking /
   * relationship integrity.
   */
  if (
    path.includes(
      '/submissions'
    ) ||

    path.endsWith(
      '/approve-profile'
    ) ||

    path.endsWith(
      '/relationship-integrity'
    )
  ) {
    return 'Applicant Submissions';
  }


  /*
   * Remaining documented Applicant operations
   * are master-profile/lifecycle operations.
   */
  return 'Applicant Core';
}


/*
 * The Applicant Documents definition already
 * comes from applicantDocumentSwagger.js.
 *
 * Keeping it there prevents duplicate top-level
 * tag definitions when Swagger specs are merged.
 */
module.exports.tags =
  APPLICANT_SWAGGER_SECTION_TAGS;


const APPLICANT_SWAGGER_HTTP_METHODS =
  new Set([
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'head',
    'options'
  ]);


for (
  const [path, pathItem]
  of Object.entries(
    module.exports.paths ||
    {}
  )
) {
  for (
    const [method, operation]
    of Object.entries(
      pathItem ||
      {}
    )
  ) {
    if (
      !APPLICANT_SWAGGER_HTTP_METHODS.has(
        method.toLowerCase()
      )
    ) {
      continue;
    }


    operation.tags = [
      resolveApplicantSwaggerSection(
        path,
        method
      )
    ];
  }
}
