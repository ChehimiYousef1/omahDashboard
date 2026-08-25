require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');
const ApplicantFormSubmission = require('../../models/ApplicantFormSubmission');

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');

    await mongoose.connect(process.env.MONGODB_URI);

    console.log('✅ Connected to MongoDB');

    // Initialize the model and create the collection if needed.
    await ApplicantFormSubmission.init();

    // Synchronize indexes defined in the Mongoose schema.
    await ApplicantFormSubmission.syncIndexes();

    console.log('✅ Migration completed successfully');
    console.log('Collection: applicant_form_submissions');

    const indexes =
      await ApplicantFormSubmission.collection.indexes();

    console.log('\nIndexes:');

    indexes.forEach((index) => {
      console.log(
        `- ${index.name}`,
        index.unique ? '(UNIQUE)' : ''
      );
    });
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error);

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB connection closed.');
  }
}

migrate();