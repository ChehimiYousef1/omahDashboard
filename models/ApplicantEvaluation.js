'use strict';

const mongoose =
  require('mongoose');

const {
  EVALUATION_RECOMMENDATIONS,
  EVALUATION_STATUSES,
} = require(
  '../utils/applicantEvaluation'
);

const {
  Schema,
} = mongoose;


const criteriaSchema =
  new Schema(
    {
      technicalFit: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },

      relevantExperience: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },

      communication: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },

      motivationCommitment: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },

      learningPotential: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
    },
    {
      _id: false,
    }
  );


const evaluatorSchema =
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


const applicantEvaluationSchema =
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

      submissionId: {
        type:
          Schema.Types.ObjectId,

        ref:
          'ApplicantFormSubmission',

        required: true,

        index: true,
      },

      evaluator: {
        type:
          evaluatorSchema,

        required: true,
      },

      criteria: {
        type:
          criteriaSchema,

        required: true,
      },

      averageRating: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },

      weightedScore: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },

      recommendation: {
        type: String,
        enum:
          EVALUATION_RECOMMENDATIONS,
        required: true,
        lowercase: true,
        trim: true,
      },

      strengths: {
        type: String,
        default: '',
        trim: true,
      },

      concerns: {
        type: String,
        default: '',
        trim: true,
      },

      summary: {
        type: String,
        default: '',
        trim: true,
      },

      status: {
        type: String,
        enum:
          EVALUATION_STATUSES,
        default: 'draft',
        lowercase: true,
        trim: true,
      },

      submittedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      collection:
        'applicant_evaluations',
    }
  );


applicantEvaluationSchema.index(
  {
    applicantId: 1,
    createdAt: -1,
  }
);


applicantEvaluationSchema.index(
  {
    applicantId: 1,
    submissionId: 1,
    'evaluator.userId': 1,
  }
);


module.exports =
  mongoose.models
    .ApplicantEvaluation ||
  mongoose.model(
    'ApplicantEvaluation',
    applicantEvaluationSchema
  );
