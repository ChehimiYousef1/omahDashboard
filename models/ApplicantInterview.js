'use strict';

const mongoose =
  require('mongoose');

const {
  INTERVIEW_TYPES,
  INTERVIEW_STATUSES,
  INTERVIEW_FORMATS,
  INTERVIEW_OUTCOMES,
} = require(
  '../utils/applicantInterview'
);

const {
  Schema,
} = mongoose;


const participantSchema =
  new Schema(
    {
      userId: {
        type: String,
        default: '',
        trim: true,
      },

      name: {
        type: String,
        default: '',
        trim: true,
      },

      email: {
        type: String,
        default: '',
        lowercase: true,
        trim: true,
      },

      participantType: {
        type: String,

        enum: [
          'applicant',
          'interviewer',
          'organizer',
          'guest',
        ],

        default: 'guest',

        lowercase: true,
        trim: true,
      },

      role: {
        type: String,
        default: '',
        trim: true,
      },
    },
    {
      _id: false,
    }
  );


const actorSchema =
  new Schema(
    {
      userId: {
        type: String,
        required: true,
        trim: true,
      },

      name: {
        type: String,
        default: '',
        trim: true,
      },

      email: {
        type: String,
        default: '',
        lowercase: true,
        trim: true,
      },

      role: {
        type: String,
        default: '',
        trim: true,
      },
    },
    {
      _id: false,
    }
  );


const interviewCalendarSchema =
  new Schema(
    {
      provider: {
        type: String,

        enum: [
          'none',
          'google',
        ],

        default: 'none',

        lowercase: true,
        trim: true,
      },

      calendarId: {
        type: String,
        default: '',
        trim: true,
      },

      eventId: {
        type: String,
        default: '',
        trim: true,
      },

      eventUrl: {
        type: String,
        default: '',
        trim: true,
      },

      meetingUrl: {
        type: String,
        default: '',
        trim: true,
      },

      syncStatus: {
        type: String,

        enum: [
          'not_configured',
          'pending',
          'synced',
          'error',
          'cancelled',
        ],

        default:
          'not_configured',

        lowercase: true,
        trim: true,
      },

      lastSyncedAt: {
        type: Date,
        default: null,
      },

      syncError: {
        type: String,
        default: '',
        trim: true,
      },
    },
    {
      _id: false,
    }
  );


const INTERVIEW_MEETING_PROVIDERS = [
  'none',
  'google_meet',
  'zoom',
  'microsoft_teams',
];


const INTERVIEW_MEETING_STATUSES = [
  'not_required',
  'pending',
  'created',
  'error',
  'cancelled',
];


const interviewMeetingSchema =
  new Schema(
    {
      provider: {
        type: String,

        enum:
          INTERVIEW_MEETING_PROVIDERS,

        default: 'none',

        lowercase: true,
        trim: true,
      },

      status: {
        type: String,

        enum:
          INTERVIEW_MEETING_STATUSES,

        default:
          'not_required',

        lowercase: true,
        trim: true,
      },

      providerMeetingId: {
        type: String,
        default: '',
        trim: true,
      },

      providerEventId: {
        type: String,
        default: '',
        trim: true,
      },

      joinUrl: {
        type: String,
        default: '',
        trim: true,
      },

      lastSyncedAt: {
        type: Date,
        default: null,
      },

      syncError: {
        type: String,
        default: '',
        trim: true,
      },
    },

    {
      _id: false,
    }
  );


const applicantInterviewSchema =
  new Schema(
    {
      applicantId: {
        type:
          Schema.Types.ObjectId,

        ref: 'Applicant',

        required: true,

        index: true,
      },

      /*
       * Optional by design.
       *
       * Interviews belong primarily to an
       * Applicant, not necessarily to one
       * specific Form submission.
       */
      submissionId: {
        type:
          Schema.Types.ObjectId,

        ref:
          'ApplicantFormSubmission',

        default: null,

        index: true,
      },

      type: {
        type: String,

        enum:
          INTERVIEW_TYPES,

        required: true,

        lowercase: true,

        trim: true,
      },

      status: {
        type: String,

        enum:
          INTERVIEW_STATUSES,

        default:
          'scheduled',

        lowercase: true,

        trim: true,

        index: true,
      },

      scheduledStart: {
        type: Date,
        required: true,
      },

      scheduledEnd: {
        type: Date,
        required: true,
      },

      timezone: {
        type: String,
        default: 'UTC',
        trim: true,
      },

      format: {
        type: String,

        enum:
          INTERVIEW_FORMATS,

        default: 'online',

        lowercase: true,

        trim: true,
      },

      /*
       * Provider-managed online meeting.
       *
       * The admin selects the provider;
       * joinUrl is generated by the server
       * integration and is never entered
       * manually by the client.
       */
      meeting: {
        type:
          interviewMeetingSchema,

        default: () => ({
          provider:
            'none',

          status:
            'not_required',
        }),
      },

      /*
       * Legacy compatibility field.
       *
       * Existing Interview records may
       * already contain this value.
       *
       * New clients cannot write it.
       * Future provider integrations will
       * mirror meeting.joinUrl here.
       */
      meetingLink: {
        type: String,
        default: '',
        trim: true,
      },

      location: {
        type: String,
        default: '',
        trim: true,
      },

      participants: {
        type: [
          participantSchema,
        ],

        default: [],
      },

      organizer: {
        type: actorSchema,
        required: true,
      },

      outcome: {
        type: String,

        enum:
          INTERVIEW_OUTCOMES,

        default: 'pending',

        lowercase: true,

        trim: true,
      },

      feedback: {
        type: String,
        default: '',
        trim: true,
      },

      notes: {
        type: String,
        default: '',
        trim: true,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      cancelledAt: {
        type: Date,
        default: null,
      },

      cancellationReason: {
        type: String,
        default: '',
        trim: true,
      },

      archived: {
        type: Boolean,
        default: false,
        index: true,
      },

      archivedAt: {
        type: Date,
        default: null,
      },

      archivedBy: {
        type: String,
        default: '',
        trim: true,
      },

      archiveReason: {
        type: String,
        default: '',
        trim: true,
      },

      calendar: {
        type:
          interviewCalendarSchema,

        default: () => ({
          provider: 'none',

          syncStatus:
            'not_configured',
        }),
      },

      createdBy: {
        type: actorSchema,
        required: true,
      },
    },
    {
      timestamps: true,

      collection:
        'applicant_interviews',
    }
  );


applicantInterviewSchema.index(
  {
    applicantId: 1,
    scheduledStart: -1,
  }
);

applicantInterviewSchema.index(
  {
    applicantId: 1,
    status: 1,
    scheduledStart: -1,
  }
);

applicantInterviewSchema.index(
  {
    'participants.userId': 1,
    scheduledStart: 1,
  }
);

applicantInterviewSchema.index(
  {
    archived: 1,
    scheduledStart: -1,
  }
);


module.exports =
  mongoose.models
    .ApplicantInterview ||
  mongoose.model(
    'ApplicantInterview',
    applicantInterviewSchema
  );

