'use strict';


const TAG =
  'Applicant Talent Pool';


const security = [
  {
    cookieAuth: [],
  },
];


const categoryIdParameter = {
  name: 'categoryId',
  in: 'path',
  required: true,
  schema: {
    type: 'string',
  },
};


const categoryBody = {
  required: true,

  content: {
    'application/json': {
      schema: {
        type: 'object',

        properties: {
          name: {
            type: 'string',
          },

          slug: {
            type: 'string',
          },

          description: {
            type: 'string',
          },

          sortOrder: {
            type: 'integer',
            minimum: 0,
          },
        },
      },
    },
  },
};


module.exports = {
  tags: [
    {
      name: TAG,

      description:
        'Talent Pool membership and configurable category management.',
    },
  ],

  paths: {
    '/api/applicants/talent-pool/categories': {
      get: {
        tags: [TAG],

        summary:
          'List Talent Pool categories',

        security,

        parameters: [
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
          200: {
            description:
              'Categories returned.',
          },

          401: {
            description:
              'Authentication required.',
          },

          403: {
            description:
              'Applicant access denied.',
          },

          500: {
            description:
              'Talent Pool request failed.',
          },
        },
      },

      post: {
        tags: [TAG],

        summary:
          'Create Talent Pool category',

        security,

        requestBody:
          categoryBody,

        responses: {
          201: {
            description:
              'Category created.',
          },

          400: {
            description:
              'Invalid category payload.',
          },

          401: {
            description:
              'Authentication required.',
          },

          403: {
            description:
              'Administrator access required.',
          },

          409: {
            description:
              'Category slug conflict.',
          },

          500: {
            description:
              'Talent Pool request failed.',
          },
        },
      },
    },


    '/api/applicants/talent-pool/categories/{categoryId}':
      {
        get: {
          tags: [TAG],

          summary:
            'Get Talent Pool category by ID',

          security,

          parameters: [
            categoryIdParameter,
          ],

          responses: {
            200: {
              description:
                'Category returned.',
            },

            400: {
              description:
                'Invalid category ID.',
            },

            401: {
              description:
                'Authentication required.',
            },

            403: {
              description:
                'Applicant access denied.',
            },

            404: {
              description:
                'Category not found.',
            },

            500: {
              description:
                'Talent Pool request failed.',
            },
          },
        },


        put: {
          tags: [TAG],

          summary:
            'Replace Talent Pool category',

          security,

          parameters: [
            categoryIdParameter,
          ],

          requestBody:
            categoryBody,

          responses: {
            200: {
              description:
                'Category replaced.',
            },

            400: {
              description:
                'Invalid category payload.',
            },

            401: {
              description:
                'Authentication required.',
            },

            403: {
              description:
                'Administrator access required.',
            },

            404: {
              description:
                'Category not found.',
            },

            409: {
              description:
                'Category conflict.',
            },

            500: {
              description:
                'Talent Pool request failed.',
            },
          },
        },


        patch: {
          tags: [TAG],

          summary:
            'Edit Talent Pool category',

          security,

          parameters: [
            categoryIdParameter,
          ],

          requestBody:
            categoryBody,

          responses: {
            200: {
              description:
                'Category updated.',
            },

            400: {
              description:
                'Invalid category payload.',
            },

            401: {
              description:
                'Authentication required.',
            },

            403: {
              description:
                'Administrator access required.',
            },

            404: {
              description:
                'Category not found.',
            },

            409: {
              description:
                'Category conflict.',
            },

            500: {
              description:
                'Talent Pool request failed.',
            },
          },
        },


        delete: {
          tags: [TAG],

          summary:
            'Archive Talent Pool category',

          security,

          parameters: [
            categoryIdParameter,
          ],

          responses: {
            200: {
              description:
                'Category archived.',
            },

            400: {
              description:
                'Invalid category ID.',
            },

            401: {
              description:
                'Authentication required.',
            },

            403: {
              description:
                'Administrator access required.',
            },

            404: {
              description:
                'Category not found.',
            },

            409: {
              description:
                'Category is active/in-use or already archived.',
            },

            500: {
              description:
                'Talent Pool request failed.',
            },
          },
        },
      },


    '/api/applicants/talent-pool/categories/{categoryId}/restore':
      {
        post: {
          tags: [TAG],

          summary:
            'Restore Talent Pool category',

          security,

          parameters: [
            categoryIdParameter,
          ],

          responses: {
            200: {
              description:
                'Category restored.',
            },

            400: {
              description:
                'Invalid category ID.',
            },

            401: {
              description:
                'Authentication required.',
            },

            403: {
              description:
                'Administrator access required.',
            },

            404: {
              description:
                'Category not found.',
            },

            409: {
              description:
                'Category is already active or conflicts with another slug.',
            },

            500: {
              description:
                'Talent Pool request failed.',
            },
          },
        },
      },
  },
};


/*
|--------------------------------------------------------------------------
| B5D1 — Talent Pool Membership Lifecycle
|--------------------------------------------------------------------------
*/


const talentPoolMembershipBody = {
  required:
    true,

  content: {
    'application/json': {
      schema: {
        type:
          'object',

        required: [
          'categoryId',
        ],

        properties: {
          categoryId: {
            type:
              'string',
          },

          roles: {
            type:
              'array',

            items: {
              type:
                'string',
            },
          },

          priority: {
            type:
              'string',

            enum: [
              'normal',
              'medium',
              'high',
            ],
          },

          ownerId: {
            type:
              'string',
          },

          source: {
            type:
              'string',
          },

          reason: {
            type:
              'string',
          },

          nextReviewAt: {
            type:
              'string',

            format:
              'date-time',

            nullable:
              true,
          },
        },
      },
    },
  },
};


const talentPoolApplicantIdParameter = {
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
};


Object.assign(
  module.exports.paths,
  {
    '/api/applicants/talent-pool/{applicantId}':
      {
        get: {
          tags: [
            TAG,
          ],

          summary:
            'Get Talent Pool membership by Applicant ID',

          security,

          parameters: [
            talentPoolApplicantIdParameter,
          ],

          responses: {
            200: {
              description:
                'Talent Pool membership returned.',
            },

            400: {
              description:
                'Invalid Applicant ID.',
            },

            401: {
              description:
                'Authentication required.',
            },

            403: {
              description:
                'Applicant access denied.',
            },

            404: {
              description:
                'Applicant or Talent Pool membership not found.',
            },

            500: {
              description:
                'Talent Pool request failed.',
            },
          },
        },


        post: {
          tags: [
            TAG,
          ],

          summary:
            'Add Applicant to Talent Pool',

          security,

          parameters: [
            talentPoolApplicantIdParameter,
          ],

          requestBody:
            talentPoolMembershipBody,

          responses: {
            201: {
              description:
                'Applicant added to Talent Pool.',
            },

            400: {
              description:
                'Invalid Talent Pool membership payload.',
            },

            401: {
              description:
                'Authentication required.',
            },

            403: {
              description:
                'Talent Pool management permission required.',
            },

            404: {
              description:
                'Applicant not found.',
            },

            409: {
              description:
                'Membership already exists, must be restored, or Applicant is archived.',
            },

            500: {
              description:
                'Talent Pool request failed.',
            },
          },
        },


        put: {
          tags: [
            TAG,
          ],

          summary:
            'Replace Talent Pool membership configuration',

          description:
            'Replaces all editable Talent Pool membership fields while preserving lifecycle metadata.',

          security,

          parameters: [
            talentPoolApplicantIdParameter,
          ],

          requestBody:
            talentPoolMembershipBody,

          responses: {
            200: {
              description:
                'Talent Pool membership replaced.',
            },

            400: {
              description:
                'Invalid Talent Pool membership payload.',
            },

            401: {
              description:
                'Authentication required.',
            },

            403: {
              description:
                'Talent Pool management permission required.',
            },

            404: {
              description:
                'Applicant or Talent Pool membership not found.',
            },

            409: {
              description:
                'Membership is inactive or Applicant is archived.',
            },

            500: {
              description:
                'Talent Pool request failed.',
            },
          },
        },


        patch: {
          tags: [
            TAG,
          ],

          summary:
            'Edit Talent Pool membership',

          description:
            'Updates selected editable Talent Pool membership fields.',

          security,

          parameters: [
            talentPoolApplicantIdParameter,
          ],

          requestBody: {
            required:
              true,

            content: {
              'application/json': {
                schema: {
                  type:
                    'object',

                  properties: {
                    categoryId: {
                      type:
                        'string',
                    },

                    roles: {
                      type:
                        'array',

                      items: {
                        type:
                          'string',
                      },
                    },

                    priority: {
                      type:
                        'string',

                      enum: [
                        'normal',
                        'medium',
                        'high',
                      ],
                    },

                    ownerId: {
                      type:
                        'string',
                    },

                    source: {
                      type:
                        'string',
                    },

                    reason: {
                      type:
                        'string',
                    },

                    nextReviewAt: {
                      type:
                        'string',

                      format:
                        'date-time',

                      nullable:
                        true,
                    },
                  },
                },
              },
            },
          },

          responses: {
            200: {
              description:
                'Talent Pool membership updated.',
            },

            400: {
              description:
                'Invalid Talent Pool membership payload.',
            },

            401: {
              description:
                'Authentication required.',
            },

            403: {
              description:
                'Talent Pool management permission required.',
            },

            404: {
              description:
                'Applicant or Talent Pool membership not found.',
            },

            409: {
              description:
                'Membership is inactive or Applicant is archived.',
            },

            500: {
              description:
                'Talent Pool request failed.',
            },
          },
        },


        delete: {
          tags: [
            TAG,
          ],

          summary:
            'Remove Applicant from Talent Pool',

          description:
            'Soft-removes Talent Pool membership only. The Applicant itself is never deleted or archived.',

          security,

          parameters: [
            talentPoolApplicantIdParameter,
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
                    removalReason: {
                      type:
                        'string',
                    },
                  },
                },
              },
            },
          },

          responses: {
            200: {
              description:
                'Applicant removed from Talent Pool.',
            },

            400: {
              description:
                'Invalid Applicant ID or removal reason.',
            },

            401: {
              description:
                'Authentication required.',
            },

            403: {
              description:
                'Talent Pool management permission required.',
            },

            404: {
              description:
                'Applicant or Talent Pool membership not found.',
            },

            409: {
              description:
                'Membership is already inactive or Applicant is archived.',
            },

            500: {
              description:
                'Talent Pool request failed.',
            },
          },
        },
      },


    '/api/applicants/talent-pool/{applicantId}/restore':
      {
        post: {
          tags: [
            TAG,
          ],

          summary:
            'Restore Talent Pool membership',

          description:
            'Restores a previously removed Talent Pool membership when its stored category is still active.',

          security,

          parameters: [
            talentPoolApplicantIdParameter,
          ],

          responses: {
            200: {
              description:
                'Talent Pool membership restored.',
            },

            400: {
              description:
                'Invalid Applicant ID.',
            },

            401: {
              description:
                'Authentication required.',
            },

            403: {
              description:
                'Talent Pool management permission required.',
            },

            404: {
              description:
                'Applicant or Talent Pool membership not found.',
            },

            409: {
              description:
                'Membership is already active, Applicant is archived, or the stored category is unavailable.',
            },

            500: {
              description:
                'Talent Pool request failed.',
            },
          },
        },
      },
  }
);


/*
|--------------------------------------------------------------------------
| B5D2 — Talent Pool Discovery
|--------------------------------------------------------------------------
*/


Object.assign(
  module.exports.paths,
  {
    '/api/applicants/talent-pool': {
      get: {
        tags: [
          TAG,
        ],

        summary:
          'Search and list Talent Pool Applicants',

        description:
          'Returns Talent Pool Applicants using server-side search, filtering, sorting, pagination, and review-state filtering.',

        security,

        parameters: [
          {
            name: 'q',
            in: 'query',
            schema: {
              type: 'string',
            },
            description:
              'Search Applicant code, name, contact fields, education, roles, skills, position data, and tags.',
          },

          {
            name: 'categoryId',
            in: 'query',
            schema: {
              type: 'string',
            },
          },

          {
            name: 'role',
            in: 'query',
            schema: {
              type: 'string',
            },
          },

          {
            name: 'skill',
            in: 'query',
            schema: {
              type: 'string',
            },
          },

          {
            name: 'technicalExperienceLevel',
            in: 'query',
            schema: {
              type: 'string',
            },
          },

          {
            name: 'tag',
            in: 'query',
            schema: {
              type: 'string',
            },
            description:
              'Filters existing Applicant recruitment.tags.',
          },

          {
            name: 'priority',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'normal',
                'medium',
                'high',
              ],
            },
          },

          {
            name: 'ownerId',
            in: 'query',
            schema: {
              type: 'string',
            },
          },

          {
            name: 'country',
            in: 'query',
            schema: {
              type: 'string',
            },
          },

          {
            name: 'city',
            in: 'query',
            schema: {
              type: 'string',
            },
          },

          {
            name: 'positionTrack',
            in: 'query',
            schema: {
              type: 'string',
            },
          },

          {
            name: 'positionType',
            in: 'query',
            schema: {
              type: 'string',
            },
          },

          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
            },
            description:
              'Applicant recruitment status.',
          },

          {
            name: 'reviewStatus',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'inactive',
                'not_scheduled',
                'scheduled',
                'due',
                'overdue',
                'reviewed',
              ],
            },
          },

          {
            name: 'active',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'true',
                'false',
                'all',
              ],
              default:
                'true',
            },
            description:
              'true = active Talent Pool members, false = removed/inactive memberships, all = both.',
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

          {
            name: 'sortBy',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'addedAt',
                'nextReviewAt',
                'lastReviewedAt',
                'fullName',
                'createdAt',
                'updatedAt',
              ],
              default:
                'addedAt',
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
        ],

        responses: {
          200: {
            description:
              'Paginated Talent Pool result returned.',
          },

          400: {
            description:
              'Invalid search, filter, pagination, or sorting parameter.',
          },

          401: {
            description:
              'Authentication required.',
          },

          403: {
            description:
              'Applicant view permission required.',
          },

          500: {
            description:
              'Talent Pool request failed.',
          },
        },
      },
    },
  }
);


/*
|--------------------------------------------------------------------------
| B5E — Talent Pool Review / Revisit
|--------------------------------------------------------------------------
*/


Object.assign(
  module.exports.paths,
  {
    '/api/applicants/talent-pool/{applicantId}/review':
      {
        post: {
          tags: [
            TAG,
          ],

          summary:
            'Complete a Talent Pool review',

          description:
            'Marks the active Talent Pool membership as reviewed by updating lastReviewedAt and lastReviewedBy. An optional nextReviewAt may immediately schedule the next revisit. This operation does not create an Applicant Task and does not create or update a Google Calendar event.',

          security,

          parameters: [
            talentPoolApplicantIdParameter,
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
                    nextReviewAt: {
                      type:
                        'string',

                      format:
                        'date-time',

                      nullable:
                        true,

                      description:
                        'Optional next revisit date-time. If omitted, the completed review clears the previous nextReviewAt schedule.',
                    },
                  },
                },
              },
            },
          },

          responses: {
            200: {
              description:
                'Talent Pool review completed.',
            },

            400: {
              description:
                'Invalid review payload or review date.',
            },

            401: {
              description:
                'Authentication required.',
            },

            403: {
              description:
                'Talent Pool management permission required.',
            },

            404: {
              description:
                'Applicant or Talent Pool membership not found.',
            },

            409: {
              description:
                'Applicant is archived or Talent Pool membership is inactive.',
            },

            500: {
              description:
                'Talent Pool review request failed.',
            },
          },
        },
      },


    '/api/applicants/talent-pool/{applicantId}/review/schedule':
      {
        post: {
          tags: [
            TAG,
          ],

          summary:
            'Schedule the next Talent Pool review',

          description:
            'Schedules nextReviewAt for an active Talent Pool membership without marking a review as completed. This operation does not create an Applicant Task and does not create or update a Google Calendar event.',

          security,

          parameters: [
            talentPoolApplicantIdParameter,
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
                    'nextReviewAt',
                  ],

                  properties: {
                    nextReviewAt: {
                      type:
                        'string',

                      format:
                        'date-time',

                      description:
                        'Future date-time for the next Talent Pool review.',
                    },
                  },
                },
              },
            },
          },

          responses: {
            200: {
              description:
                'Next Talent Pool review scheduled.',
            },

            400: {
              description:
                'nextReviewAt is missing, invalid, or in the past.',
            },

            401: {
              description:
                'Authentication required.',
            },

            403: {
              description:
                'Talent Pool management permission required.',
            },

            404: {
              description:
                'Applicant or Talent Pool membership not found.',
            },

            409: {
              description:
                'Applicant is archived or Talent Pool membership is inactive.',
            },

            500: {
              description:
                'Talent Pool review scheduling request failed.',
            },
          },
        },
      },
  }
);
