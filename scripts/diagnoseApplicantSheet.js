require("dotenv").config({ quiet: true });

const {
  fetchSheetCsv,
  csvToObjects,
} = require("../services/applicantFormSyncService");

const {
  mapApplicantFormResponse,
} = require("../services/applicantFormMapper");

(async () => {
  const { csvText } = await fetchSheetCsv(
    process.env.APPLICANT_SHEET_CSV_URL
  );

  const rows = csvToObjects(csvText);

  console.log("Response rows:", rows.length);

  if (!rows.length) {
    console.log("No rows found.");
    return;
  }

  const row = rows[0];

  console.log("\n--- NON-EMPTY SOURCE FIELDS ---");

  const nonEmpty = Object.entries(row)
    .filter(([, value]) =>
      String(value ?? "").trim()
    );

  if (!nonEmpty.length) {
    console.log("ROW IS COMPLETELY EMPTY");
  } else {
    for (const [key, value] of nonEmpty) {
      console.log(
        JSON.stringify(key),
        "=>",
        JSON.stringify(String(value))
      );
    }
  }

  const mapped =
    mapApplicantFormResponse(row);

  console.log("\n--- REQUIRED MAPPED VALUES ---");

  console.log(
    "Timestamp:",
    mapped.submittedAt
  );

  console.log(
    "Full Name:",
    mapped.personal.fullName
  );

  console.log(
    "Email:",
    mapped.personal.email
  );

  console.log(
    "Position:",
    mapped.preferences.positionTrack
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
