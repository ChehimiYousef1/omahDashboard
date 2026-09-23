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


/*
|--------------------------------------------------------------------------
| B5C — Talent Pool Category CRUD
|--------------------------------------------------------------------------
*/


function actorIdentifier(actor = {}) {
  return cleanText(
    actor.id ||
    actor._id ||
    actor.email ||
    actor.name
  );
}


function safeCategoryView(category) {
  if (!category) {
    return null;
  }

  const source =
    typeof category.toObject === 'function'
      ? category.toObject({
          getters: false,
          virtuals: false,
        })
      : category;

  return {
    id:
      source._id
        ? String(source._id)
        : '',

    name:
      cleanText(source.name),

    slug:
      cleanText(source.slug),

    description:
      cleanText(source.description),

    active:
      source.active !== false,

    sortOrder:
      Number(source.sortOrder || 0),

    createdBy:
      cleanText(source.createdBy),

    updatedBy:
      cleanText(source.updatedBy),

    archivedAt:
      source.archivedAt || null,

    archivedBy:
      cleanText(source.archivedBy),

    createdAt:
      source.createdAt || null,

    updatedAt:
      source.updatedAt || null,
  };
}


async function findCategoryBySlug(
  slug,
  {
    excludeId = null,
    CategoryModel = TalentPoolCategory,
  } = {}
) {
  const filter = {
    slug: cleanText(slug).toLowerCase(),
  };

  if (excludeId) {
    filter._id = {
      $ne: excludeId,
    };
  }

  let query =
    CategoryModel.findOne(filter);

  if (
    query &&
    typeof query.lean === 'function'
  ) {
    query = query.lean();
  }

  return query;
}


async function assertUniqueCategorySlug(
  slug,
  options = {}
) {
  const existing =
    await findCategoryBySlug(
      slug,
      options
    );

  if (existing) {
    throw serviceError(
      'TALENT_POOL_CATEGORY_CONFLICT',
      'A Talent Pool category with this slug already exists.'
    );
  }
}


async function listTalentPoolCategories({
  includeArchived = false,
  CategoryModel = TalentPoolCategory,
} = {}) {
  const filter =
    includeArchived
      ? {}
      : {
          active: true,
        };

  let query =
    CategoryModel.find(filter);

  if (
    query &&
    typeof query.sort === 'function'
  ) {
    query =
      query.sort({
        sortOrder: 1,
        name: 1,
      });
  }

  if (
    query &&
    typeof query.lean === 'function'
  ) {
    query = query.lean();
  }

  const categories =
    await query;

  return Array.from(
    categories || []
  ).map(
    safeCategoryView
  );
}


async function getTalentPoolCategory({
  categoryId,
  includeArchived = true,
  CategoryModel = TalentPoolCategory,
} = {}) {
  const id =
    assertCategoryId(categoryId);

  let query =
    CategoryModel.findById(id);

  if (
    query &&
    typeof query.lean === 'function'
  ) {
    query = query.lean();
  }

  const category =
    await query;

  if (
    !category ||
    (
      !includeArchived &&
      category.active === false
    )
  ) {
    throw serviceError(
      'TALENT_POOL_CATEGORY_NOT_FOUND',
      'Talent Pool category was not found.'
    );
  }

  return safeCategoryView(category);
}


async function createTalentPoolCategory({
  input,
  actor = {},
  CategoryModel = TalentPoolCategory,
} = {}) {
  const normalized =
    normalizeCategoryInput(
      input,
      {
        partial: false,
      }
    );

  await assertUniqueCategorySlug(
    normalized.slug,
    {
      CategoryModel,
    }
  );

  const actorId =
    actorIdentifier(actor);

  const category =
    new CategoryModel({
      ...normalized,

      active: true,
      createdBy: actorId,
      updatedBy: actorId,
      archivedAt: null,
      archivedBy: '',
    });

  try {
    await category.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw serviceError(
        'TALENT_POOL_CATEGORY_CONFLICT',
        'A Talent Pool category with this slug already exists.'
      );
    }

    throw error;
  }

  return safeCategoryView(category);
}


async function loadMutableCategory(
  categoryId,
  {
    CategoryModel = TalentPoolCategory,
  } = {}
) {
  const id =
    assertCategoryId(categoryId);

  const category =
    await CategoryModel.findById(id);

  if (!category) {
    throw serviceError(
      'TALENT_POOL_CATEGORY_NOT_FOUND',
      'Talent Pool category was not found.'
    );
  }

  return category;
}


function assertCategoryActive(category) {
  if (category.active === false) {
    throw serviceError(
      'TALENT_POOL_CATEGORY_CONFLICT',
      'Archived Talent Pool categories cannot be edited. Restore the category first.'
    );
  }
}


async function replaceTalentPoolCategory({
  categoryId,
  input,
  actor = {},
  CategoryModel = TalentPoolCategory,
} = {}) {
  const category =
    await loadMutableCategory(
      categoryId,
      {
        CategoryModel,
      }
    );

  assertCategoryActive(category);

  const normalized =
    normalizeCategoryInput(
      input,
      {
        partial: false,
      }
    );

  await assertUniqueCategorySlug(
    normalized.slug,
    {
      excludeId: category._id,
      CategoryModel,
    }
  );

  category.name =
    normalized.name;

  category.slug =
    normalized.slug;

  category.description =
    normalized.description;

  category.sortOrder =
    normalized.sortOrder;

  category.updatedBy =
    actorIdentifier(actor);

  try {
    await category.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw serviceError(
        'TALENT_POOL_CATEGORY_CONFLICT',
        'A Talent Pool category with this slug already exists.'
      );
    }

    throw error;
  }

  return safeCategoryView(category);
}


async function patchTalentPoolCategory({
  categoryId,
  input,
  actor = {},
  CategoryModel = TalentPoolCategory,
} = {}) {
  const category =
    await loadMutableCategory(
      categoryId,
      {
        CategoryModel,
      }
    );

  assertCategoryActive(category);

  const normalized =
    normalizeCategoryInput(
      input,
      {
        partial: true,
      }
    );

  if (
    Object.prototype.hasOwnProperty.call(
      normalized,
      'slug'
    )
  ) {
    await assertUniqueCategorySlug(
      normalized.slug,
      {
        excludeId: category._id,
        CategoryModel,
      }
    );
  }

  for (
    const field
    of [
      'name',
      'slug',
      'description',
      'sortOrder',
    ]
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        normalized,
        field
      )
    ) {
      category[field] =
        normalized[field];
    }
  }

  category.updatedBy =
    actorIdentifier(actor);

  try {
    await category.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw serviceError(
        'TALENT_POOL_CATEGORY_CONFLICT',
        'A Talent Pool category with this slug already exists.'
      );
    }

    throw error;
  }

  return safeCategoryView(category);
}


async function archiveTalentPoolCategory({
  categoryId,
  actor = {},
  CategoryModel = TalentPoolCategory,
  ApplicantModel = null,
  now = () => new Date(),
} = {}) {
  const category =
    await loadMutableCategory(
      categoryId,
      {
        CategoryModel,
      }
    );

  if (category.active === false) {
    throw serviceError(
      'TALENT_POOL_CATEGORY_CONFLICT',
      'Talent Pool category is already archived.'
    );
  }

  if (
    ApplicantModel &&
    typeof ApplicantModel.exists === 'function'
  ) {
    const inUse =
      await ApplicantModel.exists({
        'talentPool.active': true,
        'talentPool.categoryId':
          category._id,
      });

    if (inUse) {
      throw serviceError(
        'TALENT_POOL_CATEGORY_IN_USE',
        'Talent Pool category cannot be archived while active Applicants use it.'
      );
    }
  }

  const actorId =
    actorIdentifier(actor);

  category.active = false;
  category.archivedAt = now();
  category.archivedBy = actorId;
  category.updatedBy = actorId;

  await category.save();

  return safeCategoryView(category);
}


async function restoreTalentPoolCategory({
  categoryId,
  actor = {},
  CategoryModel = TalentPoolCategory,
} = {}) {
  const category =
    await loadMutableCategory(
      categoryId,
      {
        CategoryModel,
      }
    );

  if (category.active !== false) {
    throw serviceError(
      'TALENT_POOL_CATEGORY_CONFLICT',
      'Talent Pool category is already active.'
    );
  }

  await assertUniqueCategorySlug(
    category.slug,
    {
      excludeId: category._id,
      CategoryModel,
    }
  );

  const actorId =
    actorIdentifier(actor);

  category.active = true;
  category.archivedAt = null;
  category.archivedBy = '';
  category.updatedBy = actorId;

  await category.save();

  return safeCategoryView(category);
}


Object.assign(
  module.exports,
  {
    actorIdentifier,
    safeCategoryView,

    findCategoryBySlug,
    assertUniqueCategorySlug,

    listTalentPoolCategories,
    getTalentPoolCategory,
    createTalentPoolCategory,
    replaceTalentPoolCategory,
    patchTalentPoolCategory,
    archiveTalentPoolCategory,
    restoreTalentPoolCategory,
  }
);
