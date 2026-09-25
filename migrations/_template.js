'use strict';

/*
 * Copy this file to a numbered filename, for example:
 *
 *   migrations/001_add_example_field.js
 *
 * The filename prefix is the migration id. Migrations are forward-only
 * through the production runner. Application rollback does not imply
 * automatic database rollback.
 */

module.exports = {
  description: 'Describe the migration',

  async up({ db }) {
    // Example:
    // await db.collection('example').updateMany(
    //   { newField: { $exists: false } },
    //   { $set: { newField: null } }
    // );

    void db;
  },
};
