'use strict';

const mongoose =
  require('mongoose');

const TalentPoolCategory =
  require(
    '../models/TalentPoolCategory'
  );

const {
  slugify,
} =
  require(
    '../models/TalentPoolCategory'
  );


const DEFAULT_TALENT_POOL_CATEGORIES =
  Object.freeze([
    {
      name:
        'Strong Candidate',

      slug:
        'strong-candidate',

      description:
        'High-quality Applicant worth retaining for a suitable future opportunity.',

      sortOrder:
        10,
    },

    {
      name:
        'Future Opportunity',

      slug:
        'future-opportunity',

      description:
        'Suitable Applicant whose profile may match a future role or project.',

      sortOrder:
        20,
    },

    {
      name:
        'Internship Candidate',

      slug:
        'internship-candidate',

      description:
        'Applicant suitable for a future internship or trainee opportunity.',

      sortOrder:
        30,
    },

    {
      name:
        'Junior Talent',

      slug:
        'junior-talent',

      description:
        'Early-career Applicant with future development or hiring potential.',

      sortOrder:
        40,
    },

    {
      name:
        'Experienced Talent',

      slug:
        'experienced-talent',

      description:
        'Applicant with established professional experience worth retaining.',

      sortOrder:
        50,
    },

    {
      name:
        'Specialist',

      slug:
        'specialist',

      description:
        'Applicant retained for a specialized technical or business capability.',

      sortOrder:
        60,
    },

    {
      name:
        'Freelance / Project-Based',

      slug:
        'freelance-project-based',

      description:
        'Applicant suitable for freelance, consulting, or project-based work.',

      sortOrder:
        70,
    },

    {
      name:
        'Not Available Now',

      slug:
        'not-available-now',

      description:
        'Suitable Applicant who is currently unavailable but may be revisited later.',

      sortOrder:
        80,
    },

    {
      name:
        'Reconsider Later',

      slug:
        'reconsider-later',

      description:
        'Applicant intentionally retained for a later recruitment review.',

      sortOrder:
        90,
    },
  ]);


function serviceError(
  code,
  message
) {
  const error =
    new Error(
      message
    );

  error.code =
    code;

  return error;
}


function cleanText(
  value
) {
  return String(
    value ?? ''
  ).trim();
}


function normalizeSortOrder(
  value,
  fallback = 0
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return fallback;
  }

  const number =
    Number(value);

  if (
    !Number.isInteger(
      number
    ) ||
    number < 0
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_CATEGORY',
      'Category sortOrder must be a non-negative integer.'
    );
  }

  return number;
}


function normalizeCategoryInput(
  input = {},
  {
    partial =
      false,
  } = {}
) {
  if (
    !input ||
    typeof input !==
      'object' ||
    Array.isArray(input)
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_CATEGORY',
      'Talent Pool category payload must be an object.'
    );
  }

  const allowed =
    new Set([
      'name',
      'slug',
      'description',
      'sortOrder',
    ]);

  for (
    const key
    of Object.keys(input)
  ) {
    if (
      !allowed.has(key)
    ) {
      throw serviceError(
        'INVALID_TALENT_POOL_CATEGORY',
        `Unsupported Talent Pool category field: ${key}`
      );
    }
  }

  const output =
    {};

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'name'
      )
  ) {
    const name =
      cleanText(
        input.name
      );

    if (!name) {
      throw serviceError(
        'INVALID_TALENT_POOL_CATEGORY',
        'Talent Pool category name is required.'
      );
    }

    if (
      name.length >
      120
    ) {
      throw serviceError(
        'INVALID_TALENT_POOL_CATEGORY',
        'Talent Pool category name is too long.'
      );
    }

    output.name =
      name;
  } else if (!partial) {
    throw serviceError(
      'INVALID_TALENT_POOL_CATEGORY',
      'Talent Pool category name is required.'
    );
  }

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'slug'
      ) ||
    (
      !partial &&
      output.name
    )
  ) {
    const slug =
      slugify(
        input.slug ||
        output.name
      );

    if (!slug) {
      throw serviceError(
        'INVALID_TALENT_POOL_CATEGORY',
        'Talent Pool category slug is invalid.'
      );
    }

    output.slug =
      slug;
  }

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'description'
      )
  ) {
    const description =
      cleanText(
        input.description
      );

    if (
      description.length >
      1000
    ) {
      throw serviceError(
        'INVALID_TALENT_POOL_CATEGORY',
        'Talent Pool category description is too long.'
      );
    }

    output.description =
      description;
  } else if (!partial) {
    output.description =
      '';
  }

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        input,
        'sortOrder'
      )
  ) {
    output.sortOrder =
      normalizeSortOrder(
        input.sortOrder
      );
  } else if (!partial) {
    output.sortOrder =
      0;
  }

  if (
    partial &&
    Object.keys(output)
      .length === 0
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_CATEGORY',
      'At least one editable category field is required.'
    );
  }

  return output;
}


function assertCategoryId(
  categoryId
) {
  const id =
    cleanText(
      categoryId
    );

  if (
    !mongoose.Types
      .ObjectId
      .isValid(id)
  ) {
    throw serviceError(
      'INVALID_TALENT_POOL_CATEGORY_ID',
      'Talent Pool category id is invalid.'
    );
  }

  return id;
}


function defaultCategoryDocuments() {
  return DEFAULT_TALENT_POOL_CATEGORIES
    .map(
      category => ({
        ...category,
        active:
          true,
      })
    );
}


module.exports = {
  TalentPoolCategory,

  DEFAULT_TALENT_POOL_CATEGORIES,

  serviceError,
  cleanText,
  normalizeSortOrder,
  normalizeCategoryInput,
  assertCategoryId,
  defaultCategoryDocuments,
};
