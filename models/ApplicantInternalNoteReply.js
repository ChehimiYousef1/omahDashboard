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


const applicantInternalNoteReplySchema =
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

      noteId: {
        type:
          Schema.Types.ObjectId,

        ref:
          'ApplicantInternalNote',

        required: true,
        index: true,
      },

      content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
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
        'applicant_internal_note_replies',
    }
  );


applicantInternalNoteReplySchema.index({
  applicantId: 1,
  noteId: 1,
  archived: 1,
  createdAt: 1,
});


module.exports =
  mongoose.models
    .ApplicantInternalNoteReply ||
  mongoose.model(
    'ApplicantInternalNoteReply',
    applicantInternalNoteReplySchema
  );
