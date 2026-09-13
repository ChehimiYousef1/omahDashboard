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

const interviewIdParameter = {
  name: 'interviewId',

  in: 'path',

  required: true,

  schema: {
    type: 'string',
  },

  description:
    'ApplicantInterview MongoDB ObjectId',
};

const commonResponses = {
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

const scheduleProperties = {
  submissionId: {
    type: 'string',
    nullable: true,
  },

  type: {
    type: 'string',

    enum: [
      'screening',
      'hr',
      'technical',
      'behavioral',
      'managerial',
      'final',
      'other',
    ],
  },

  scheduledStart: {
    type: 'string',
    format: 'date-time',
  },

  scheduledEnd: {
    type: 'string',
    format: 'date-time',
  },

  timezone: {
    type: 'string',

    example:
      'Asia/Beirut',
  },

  format: {
    type: 'string',

    enum: [
      'online',
      'onsite',
      'phone',
    ],
  },

  meetingLink: {
    type: 'string',
  },

  location: {
    type: 'string',
  },

  participants: {
    type: 'array',

    minItems: 1,

    items: {
      type: 'object',

      properties: {
        userId: {
          type: 'string',
        },

        name: {
          type: 'string',
        },

        email: {
          type: 'string',
          format: 'email',
        },

        participantType: {
          type: 'string',

          enum: [
            'applicant',
            'interviewer',
            'organizer',
            'guest',
          ],
        },

        role: {
          type: 'string',
        },
      },
    },
  },

  notes: {
    type: 'string',
  },
};

const availabilityProperties = {
  scheduledStart: {
    type: 'string',
    format: 'date-time',
  },

  scheduledEnd: {
    type: 'string',
    format: 'date-time',
  },

  timezone: {
    type: 'string',

    example:
      'Asia/Beirut',
  },

  participants:
    scheduleProperties
      .participants,

  calendarIds: {
    type: 'array',

    items: {
      type: 'string',
    },

    description:
      'Optional explicit internal calendars to check. Applicant private calendars are not queried by default.',
  },

  excludeInterviewId: {
    type: 'string',
    nullable: true,

    description:
      'Interview ID to exclude while checking availability during rescheduling.',
  },
};


module.exports = {
  paths: {
    '/api/applicants/{id}/interviews/availability':
      {
        post: {
          tags: [
            'Applicants',
          ],

          summary:
            'Check Applicant interview availability',

          description:
            'Read-only availability check. Detects overlapping OMAH interviews and, when Google Calendar is enabled and configured, checks internal organizer/interviewer calendars through Google Free/Busy. It does not create or modify an interview or Calendar event.',

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
                    'scheduledStart',
                    'scheduledEnd',
                  ],

                  properties:
                    availabilityProperties,
                },
              },
            },
          },

          responses: {
            200: {
              description:
                'Availability result',
            },

            ...commonResponses,
          },
        },
      },


    '/api/applicants/{id}/interviews':
      {
        get: {
          tags: [
            'Applicants',
          ],

          summary:
            'List Applicant interviews',

          description:
            'Returns interview history for the Applicant. Interview records are independent from the Applicant recruitment pipeline status.',

          parameters: [
            idParameter,

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
                'Applicant interview history',
            },

            ...commonResponses,
          },
        },

        post: {
          tags: [
            'Applicants',
          ],

          summary:
            'Schedule an Applicant interview',

          description:
            'Creates a new scheduled interview. The authenticated admin is recorded as the creator and organizer.',

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
                    'type',
                    'scheduledStart',
                    'scheduledEnd',
                    'participants',
                  ],

                  properties:
                    scheduleProperties,
                },
              },
            },
          },

          responses: {
            201: {
              description:
                'Interview scheduled',
            },

            ...commonResponses,
          },
        },
      },

    '/api/applicants/{id}/interviews/{interviewId}':
      {
        patch: {
          tags: [
            'Applicants',
          ],

          summary:
            'Edit or reschedule an interview',

          description:
            'Only scheduled interviews can be edited or rescheduled.',

          parameters: [
            idParameter,
            interviewIdParameter,
          ],

          requestBody: {
            required: true,

            content: {
              'application/json': {
                schema: {
                  type:
                    'object',

                  properties:
                    scheduleProperties,
                },
              },
            },
          },

          responses: {
            200: {
              description:
                'Interview updated',
            },

            ...commonResponses,
          },
        },

        delete: {
          tags: [
            'Applicants',
          ],

          summary:
            'Archive an interview',

          description:
            'Soft-deletes the interview from active history. The database record is retained.',

          parameters: [
            idParameter,
            interviewIdParameter,
          ],

          requestBody: {
            required: false,

            content: {
              'application/json': {
                schema: {
                  type:
                    'object',

                  properties: {
                    reason: {
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
                'Interview archived',
            },

            ...commonResponses,
          },
        },
      },

    '/api/applicants/{id}/interviews/{interviewId}/complete':
      {
        post: {
          tags: [
            'Applicants',
          ],

          summary:
            'Complete an interview',

          parameters: [
            idParameter,
            interviewIdParameter,
          ],

          requestBody: {
            required: false,

            content: {
              'application/json': {
                schema: {
                  type:
                    'object',

                  properties: {
                    outcome: {
                      type:
                        'string',

                      enum: [
                        'pending',
                        'recommended',
                        'not_recommended',
                        'on_hold',
                      ],
                    },

                    feedback: {
                      type:
                        'string',
                    },

                    notes: {
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
                'Interview completed',
            },

            ...commonResponses,
          },
        },
      },

    '/api/applicants/{id}/interviews/{interviewId}/cancel':
      {
        post: {
          tags: [
            'Applicants',
          ],

          summary:
            'Cancel an interview',

          parameters: [
            idParameter,
            interviewIdParameter,
          ],

          requestBody: {
            required: false,

            content: {
              'application/json': {
                schema: {
                  type:
                    'object',

                  properties: {
                    reason: {
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
                'Interview cancelled',
            },

            ...commonResponses,
          },
        },
      },

    '/api/applicants/{id}/interviews/{interviewId}/no-show':
      {
        post: {
          tags: [
            'Applicants',
          ],

          summary:
            'Mark an Applicant interview as no-show',

          parameters: [
            idParameter,
            interviewIdParameter,
          ],

          requestBody: {
            required: false,

            content: {
              'application/json': {
                schema: {
                  type:
                    'object',

                  properties: {
                    notes: {
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
                'Interview marked as no-show',
            },

            ...commonResponses,
          },
        },
      },
  },
};

