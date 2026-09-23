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
