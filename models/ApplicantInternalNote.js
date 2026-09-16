'use strict';

const mongoose =
  require('mongoose');

const {
  Schema,
} = mongoose;


const actorSchema =
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


const scheduleSchema =
  new Schema(
    {
      startAt: {
        type: Date,
        default: null,
      },

      endAt: {
        type: Date,
        default: null,
      },

      reminderAt: {
        type: Date,
        default: null,
      },

      reminderNote: {
        type: String,
        default: '',
        trim: true,
        maxlength: 1000,
      },
    },
    {
      _id: false,
    }
  );


const calendarSchema =
  new Schema(
    {
      provider: {
        type: String,
        enum: [
          '',
          'google_calendar',
        ],
        default: '',
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

      syncStatus: {
        type: String,
        enum: [
          'not_synced',
          'synced',
          'error',
        ],
        default:
          'not_synced',
      },

      syncedAt: {
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


const applicantInternalNoteSchema =
  new Schema(
    {
      applicantId: {
        type:
          Schema.Types.ObjectId,

        ref:
          'Applicant',

        required: true,
        index: true,
      },

      kind: {
        type: String,

        enum: [
          'note',
          'task',
        ],

        default:
          'note',

        index: true,
      },

      content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 4000,
      },

      taskStatus: {
        type: String,

        enum: [
          'todo',
          'completed',
        ],

        default:
          'todo',

        index: true,
      },

      important: {
        type: Boolean,
        default: false,
        index: true,
      },

      likedBy: {
        type: [
          String,
        ],

        default:
          [],
      },

      starredBy: {
        type: [
          String,
        ],

        default:
          [],
      },

      schedule: {
        type:
          scheduleSchema,

        default:
          () => ({}),
      },

      calendar: {
        type:
          calendarSchema,

        default:
          () => ({}),
      },

      author: {
        type:
          actorSchema,

        required: true,
      },

      updatedBy: {
        type:
          actorSchema,

        default:
          () => ({}),
      },

      completedAt: {
        type: Date,
        default: null,
      },

      completedBy: {
        type:
          actorSchema,

        default:
          () => ({}),
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
        type:
          actorSchema,

        default:
          () => ({}),
      },
    },
    {
      timestamps: true,

      collection:
        'applicant_internal_notes',
    }
  );


applicantInternalNoteSchema.index(
  {
    applicantId: 1,
    archived: 1,
    kind: 1,
    createdAt: -1,
    _id: -1,
  }
);


module.exports =
  mongoose.models
    .ApplicantInternalNote ||
  mongoose.model(
    'ApplicantInternalNote',
    applicantInternalNoteSchema
  );
