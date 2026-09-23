'use strict';

const mongoose =
  require('mongoose');

const {
  Schema,
} = mongoose;


function slugify(
  value
) {
  return String(
    value || ''
  )
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(
      /[^\x00-\x7F]/g,
      ''
    )
    .replace(
      /[^a-z0-9]+/g,
      '-'
    )
    .replace(
      /^-+|-+$/g,
      ''
    );
}


const talentPoolCategorySchema =
  new Schema(
    {
      name: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          120,
      },

      slug: {
        type:
          String,

        required:
          true,

        trim:
          true,

        lowercase:
          true,

        maxlength:
          140,
      },

      description: {
        type:
          String,

        trim:
          true,

        maxlength:
          1000,

        default:
          '',
      },

      active: {
        type:
          Boolean,

        default:
          true,

        index:
          true,
      },

      sortOrder: {
        type:
          Number,

        min:
          0,

        default:
          0,
      },

      createdBy: {
        type:
          String,

        trim:
          true,

        default:
          '',
      },

      updatedBy: {
        type:
          String,

        trim:
          true,

        default:
          '',
      },

      archivedAt: {
        type:
          Date,

        default:
          null,
      },

      archivedBy: {
        type:
          String,

        trim:
          true,

        default:
          '',
      },
    },
    {
      timestamps:
        true,

      collection:
        'talent_pool_categories',
    }
  );


talentPoolCategorySchema.pre(
  'validate',

  function normalizeCategory(
    next
  ) {
    if (
      this.name
    ) {
      this.name =
        String(
          this.name
        ).trim();
    }

    this.slug =
      slugify(
        this.slug ||
        this.name
      );

    next();
  }
);


talentPoolCategorySchema.index(
  {
    slug: 1,
  },
  {
    unique:
      true,

    name:
      'talent_pool_category_slug_unique',
  }
);


talentPoolCategorySchema.index(
  {
    active:
      1,

    sortOrder:
      1,

    name:
      1,
  },
  {
    name:
      'talent_pool_category_active_sort',
  }
);


module.exports =
  mongoose.model(
    'TalentPoolCategory',
    talentPoolCategorySchema
  );

module.exports.slugify =
  slugify;
