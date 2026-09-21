'use strict';

const mongoose =
  require('mongoose');

const {
  APPLICANT_ACTIVITY_CATEGORIES,
  APPLICANT_ACTIVITY_TYPES,
} = require(
  '../utils/applicantActivity'
);

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


const sourceSchema =
  new Schema(
    {
      type: {
        type: String,
        default: '',
        trim: true,
      },

      id: {
        type: String,
        default: '',
        trim: true,
      },
    },
    {
      _id: false,
    }
  );


/*
|--------------------------------------------------------------------------
| Structured Audit Changes
|--------------------------------------------------------------------------
|
| Existing ApplicantActivity documents remain valid.
|
| New audit-aware writes may additionally capture exact before/after values.
| Historical records without this field continue to use metadata fallback.
|
*/

const auditChangeSchema =
  new Schema(
    {
      field: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },

      label: {
        type: String,
        default: '',
        trim: true,
        maxlength: 200,
      },

      before: {
        type:
          Schema.Types.Mixed,

        default:
          null,
      },

      after: {
        type:
          Schema.Types.Mixed,

        default:
          null,
      },
    },
    {
      _id: false,
    }
  );


const applicantActivitySchema =
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

      type: {
        type: String,

        enum:
          APPLICANT_ACTIVITY_TYPES,

        required: true,

        trim: true,

        index: true,
      },

      category: {
        type: String,

        enum:
          APPLICANT_ACTIVITY_CATEGORIES,

        required: true,

        trim: true,

        index: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },

      description: {
        type: String,
        default: '',
        trim: true,
        maxlength: 4000,
      },

      occurredAt: {
        type: Date,
        required: true,
        index: true,
      },

      actor: {
        type:
          actorSchema,

        default:
          () => ({}),
      },

      source: {
        type:
          sourceSchema,

        default:
          () => ({}),
      },

      /*
       * Audit schema version.
       *
       * Version 1 keeps old ApplicantActivity
       * records fully backward-compatible.
       */
      auditVersion: {
        type: Number,
        default: 1,
        min: 1,
      },

      /*
       * Structured before/after changes.
       *
       * Empty for legacy/general activity
       * events that did not capture an
       * exact field-level transition.
       */
      changes: {
        type: [
          auditChangeSchema
        ],

        default:
          () => [],
      },

      metadata: {
        type:
          Schema.Types.Mixed,

        default:
          () => ({}),
      },
    },
    {
      timestamps: true,

      collection:
        'applicant_activities',
    }
  );


applicantActivitySchema.index(
  {
    applicantId: 1,
    occurredAt: -1,
    _id: -1,
  }
);


applicantActivitySchema.index(
  {
    applicantId: 1,
    category: 1,
    occurredAt: -1,
  }
);


applicantActivitySchema.index(
  {
    applicantId: 1,
    type: 1,
    occurredAt: -1,
  }
);


module.exports =
  mongoose.models
    .ApplicantActivity ||
  mongoose.model(
    'ApplicantActivity',
    applicantActivitySchema
  );
