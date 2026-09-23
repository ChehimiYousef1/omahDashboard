'use strict';

const assert =
  require('assert');

const {
  createTalentPoolCategory,
  replaceTalentPoolCategory,
  patchTalentPoolCategory,
  archiveTalentPoolCategory,
  restoreTalentPoolCategory,
  listTalentPoolCategories,
  getTalentPoolCategory,
} =
  require(
    '../services/applicantTalentPoolCategoryService'
  );


const ID =
  '64b64c000000000000000002';


function makeDoc(
  overrides = {}
) {
  return {
    _id:
      ID,

    name:
      'Strong Candidate',

    slug:
      'strong-candidate',

    description:
      'Strong candidate',

    active:
      true,

    sortOrder:
      10,

    createdBy:
      'admin',

    updatedBy:
      'admin',

    archivedAt:
      null,

    archivedBy:
      '',

    async save() {
      return this;
    },

    ...overrides,
  };
}


async function run() {
  class CreateModel {
    constructor(input) {
      Object.assign(
        this,
        {
          _id: ID,
        },
        input
      );
    }

    async save() {
      return this;
    }

    static findOne() {
      return {
        async lean() {
          return null;
        },
      };
    }
  }


  const created =
    await createTalentPoolCategory({
      input: {
        name:
          'Data Talent',

        description:
          'Analytics candidates',

        sortOrder:
          25,
      },

      actor: {
        name:
          'Admin User',
      },

      CategoryModel:
        CreateModel,
    });

  assert.strictEqual(
    created.slug,
    'data-talent'
  );


  const listModel = {
    find(filter) {
      assert.deepStrictEqual(
        filter,
        {
          active: true,
        }
      );

      return {
        sort(sort) {
          assert.deepStrictEqual(
            sort,
            {
              sortOrder: 1,
              name: 1,
            }
          );

          return {
            async lean() {
              return [
                makeDoc(),
              ];
            },
          };
        },
      };
    },
  };

  const list =
    await listTalentPoolCategories({
      CategoryModel:
        listModel,
    });

  assert.strictEqual(
    list.length,
    1
  );


  const getModel = {
    findById() {
      return {
        async lean() {
          return makeDoc();
        },
      };
    },
  };

  const fetched =
    await getTalentPoolCategory({
      categoryId: ID,
      CategoryModel:
        getModel,
    });

  assert.strictEqual(
    fetched.id,
    ID
  );


  const putDoc =
    makeDoc();

  const putModel = {
    async findById() {
      return putDoc;
    },

    findOne() {
      return {
        async lean() {
          return null;
        },
      };
    },
  };

  const replaced =
    await replaceTalentPoolCategory({
      categoryId: ID,

      input: {
        name:
          'Future Data Talent',

        description:
          'Updated',

        sortOrder:
          50,
      },

      actor: {
        id: 'admin-1',
      },

      CategoryModel:
        putModel,
    });

  assert.strictEqual(
    replaced.slug,
    'future-data-talent'
  );


  const patchDoc =
    makeDoc();

  const patchModel = {
    async findById() {
      return patchDoc;
    },

    findOne() {
      return {
        async lean() {
          return null;
        },
      };
    },
  };

  const patched =
    await patchTalentPoolCategory({
      categoryId: ID,

      input: {
        description:
          'Edited',
      },

      CategoryModel:
        patchModel,
    });

  assert.strictEqual(
    patched.description,
    'Edited'
  );

  assert.strictEqual(
    patched.slug,
    'strong-candidate'
  );


  const archiveDoc =
    makeDoc();

  const archived =
    await archiveTalentPoolCategory({
      categoryId: ID,

      actor: {
        id: 'admin-1',
      },

      CategoryModel: {
        async findById() {
          return archiveDoc;
        },
      },

      ApplicantModel: {
        async exists() {
          return false;
        },
      },

      now:
        () =>
          new Date(
            '2026-09-23T10:00:00Z'
          ),
    });

  assert.strictEqual(
    archived.active,
    false
  );


  await assert.rejects(
    () =>
      archiveTalentPoolCategory({
        categoryId: ID,

        CategoryModel: {
          async findById() {
            return makeDoc();
          },
        },

        ApplicantModel: {
          async exists() {
            return true;
          },
        },
      }),

    error =>
      error.code ===
      'TALENT_POOL_CATEGORY_IN_USE'
  );


  const restoreDoc =
    makeDoc({
      active: false,
      archivedAt:
        new Date(),
      archivedBy:
        'admin',
    });

  const restored =
    await restoreTalentPoolCategory({
      categoryId: ID,

      CategoryModel: {
        async findById() {
          return restoreDoc;
        },

        findOne() {
          return {
            async lean() {
              return null;
            },
          };
        },
      },
    });

  assert.strictEqual(
    restored.active,
    true
  );

  assert.strictEqual(
    restored.archivedAt,
    null
  );


  await assert.rejects(
    () =>
      createTalentPoolCategory({
        input: {
          name:
            'Strong Candidate',
        },

        CategoryModel:
          class {
            static findOne() {
              return {
                async lean() {
                  return {
                    _id:
                      'existing',
                  };
                },
              };
            }
          },
      }),

    error =>
      error.code ===
      'TALENT_POOL_CATEGORY_CONFLICT'
  );


  console.log(
    '✅ GET all categories'
  );

  console.log(
    '✅ GET category by ID'
  );

  console.log(
    '✅ POST category'
  );

  console.log(
    '✅ PUT full update'
  );

  console.log(
    '✅ PATCH partial edit'
  );

  console.log(
    '✅ DELETE soft archive'
  );

  console.log(
    '✅ category-in-use protection'
  );

  console.log(
    '✅ POST restore'
  );

  console.log(
    '✅ duplicate slug conflict'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nAPPLICANT TALENT POOL CATEGORY CRUD TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
