'use strict';

const PDFDocument =
  require('pdfkit');


function displayValue(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return '—';
  }

  if (Array.isArray(value)) {
    return value.length
      ? value.join(', ')
      : '—';
  }

  return String(value);
}


function displayDate(
  value,
  {
    dateOnly = false,
  } = {}
) {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  if (dateOnly) {
    return date
      .toISOString()
      .slice(0, 10);
  }

  return date
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, ' UTC');
}


function renderApplicantSummaryPdf(
  report
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const document =
        new PDFDocument({
          size:
            'A4',

          margins: {
            top: 48,
            right: 50,
            bottom: 48,
            left: 50,
          },

          info: {
            Title:
              'OMAH Applicant Summary',

            Author:
              'OMAH Recruitment',

            Subject:
              'Applicant recruitment summary',
          },
        });

      const chunks = [];

      document.on(
        'data',
        chunk =>
          chunks.push(chunk)
      );

      document.on(
        'error',
        reject
      );

      document.on(
        'end',
        () => {
          resolve(
            Buffer.concat(
              chunks
            )
          );
        }
      );


      function ensureSpace(
        height = 70
      ) {
        if (
          document.y +
            height >
          document.page.height -
            document.page.margins
              .bottom
        ) {
          document.addPage();
        }
      }


      function section(
        title
      ) {
        ensureSpace(65);

        document
          .moveDown(0.7)
          .font(
            'Helvetica-Bold'
          )
          .fontSize(12)
          .text(title);

        document
          .moveDown(0.25)
          .strokeColor(
            '#d1d5db'
          )
          .moveTo(
            document.page
              .margins.left,
            document.y
          )
          .lineTo(
            document.page
              .width -
              document.page
                .margins.right,
            document.y
          )
          .stroke();

        document
          .moveDown(0.5)
          .fillColor(
            '#111827'
          );
      }


      function row(
        label,
        value
      ) {
        ensureSpace(34);

        const left =
          document.page
            .margins.left;

        const labelWidth =
          155;

        const valueWidth =
          document.page
            .width -
          document.page
            .margins.left -
          document.page
            .margins.right -
          labelWidth;

        const startY =
          document.y;

        document
          .font(
            'Helvetica-Bold'
          )
          .fontSize(9.5)
          .fillColor(
            '#4b5563'
          )
          .text(
            label,
            left,
            startY,
            {
              width:
                labelWidth,
            }
          );

        document
          .font(
            'Helvetica'
          )
          .fillColor(
            '#111827'
          )
          .text(
            displayValue(
              value
            ),
            left +
              labelWidth,
            startY,
            {
              width:
                valueWidth,
            }
          );

        document.y =
          Math.max(
            document.y,
            startY + 16
          );
      }


      const fullName =
        report
          ?.identity
          ?.fullName ||
        'Applicant';

      document
        .font(
          'Helvetica-Bold'
        )
        .fontSize(20)
        .fillColor(
          '#111827'
        )
        .text(
          'OMAH Recruitment'
        );

      document
        .moveDown(0.2)
        .fontSize(15)
        .text(
          'Applicant Summary'
        );

      document
        .moveDown(0.35)
        .font(
          'Helvetica'
        )
        .fontSize(10)
        .fillColor(
          '#4b5563'
        )
        .text(fullName);

      document
        .moveDown(0.2)
        .text(
          `Generated: ${displayDate(
            report
              ?.report
              ?.generatedAt
          )}`
        );


      section(
        'Personal Information'
      );

      row(
        'Full Name',
        report
          ?.identity
          ?.fullName
      );

      row(
        'Email',
        report
          ?.identity
          ?.email
      );

      row(
        'Phone',
        report
          ?.identity
          ?.phoneNumber
      );

      row(
        'Country',
        report
          ?.identity
          ?.country
      );

      row(
        'City',
        report
          ?.identity
          ?.city
      );


      section(
        'Application'
      );

      row(
        'Applicant Code',
        report
          ?.application
          ?.applicantCode
      );

      row(
        'Position Track',
        report
          ?.application
          ?.positionTrack
      );

      row(
        'Position Type',
        report
          ?.application
          ?.positionType
      );

      row(
        'Current Status',
        report
          ?.application
          ?.status
      );

      row(
        'Source',
        report
          ?.application
          ?.source
      );

      row(
        'First Applied',
        displayDate(
          report
            ?.application
            ?.firstAppliedAt,
          {
            dateOnly:
              true,
          }
        )
      );

      row(
        'Last Applied',
        displayDate(
          report
            ?.application
            ?.lastAppliedAt,
          {
            dateOnly:
              true,
          }
        )
      );


      section(
        'Education'
      );

      row(
        'University',
        report
          ?.education
          ?.universityName
      );

      row(
        'Institution Country',
        report
          ?.education
          ?.institutionCountry
      );

      row(
        'Degree',
        report
          ?.education
          ?.degreeLevel
      );

      row(
        'Major',
        report
          ?.education
          ?.major
      );

      row(
        'Specialization',
        report
          ?.education
          ?.specialization
      );

      row(
        'Study Status',
        report
          ?.education
          ?.studyStatus
      );

      row(
        'Graduation',
        displayDate(
          report
            ?.education
            ?.graduationDate,
          {
            dateOnly:
              true,
          }
        )
      );

      row(
        'Languages',
        report
          ?.education
          ?.languages
      );

      row(
        'English Proficiency',
        report
          ?.education
          ?.englishProficiency
      );


      section(
        'Skills & Experience'
      );

      row(
        'Primary Technical',
        report
          ?.skills
          ?.primaryTechnical
      );

      row(
        'Programming Languages',
        report
          ?.skills
          ?.programmingLanguages
      );

      row(
        'Frameworks',
        report
          ?.skills
          ?.frameworks
      );

      row(
        'Databases',
        report
          ?.skills
          ?.databases
      );

      row(
        'Cloud / DevOps',
        report
          ?.skills
          ?.cloudDevOps
      );

      row(
        'Development Tools',
        report
          ?.skills
          ?.developmentTools
      );

      row(
        'Experience Level',
        report
          ?.skills
          ?.technicalExperienceLevel
      );


      section(
        'Latest Interview'
      );

      if (
        !report
          ?.latestInterview
      ) {
        row(
          'Interview',
          'No active interview history'
        );
      } else {
        row(
          'Type',
          report
            .latestInterview
            .type
        );

        row(
          'Status',
          report
            .latestInterview
            .status
        );

        row(
          'Format',
          report
            .latestInterview
            .format
        );

        row(
          'Scheduled',
          displayDate(
            report
              .latestInterview
              .scheduledStart
          )
        );

        row(
          'Outcome',
          report
            .latestInterview
            .outcome
        );
      }


      section(
        'Latest Evaluation'
      );

      if (
        !report
          ?.latestEvaluation
      ) {
        row(
          'Evaluation',
          'No active evaluation history'
        );
      } else {
        const evaluation =
          report.latestEvaluation;

        row(
          'Evaluator',
          evaluation
            ?.evaluator
            ?.name
        );

        row(
          'Evaluator Role',
          evaluation
            ?.evaluator
            ?.role
        );

        row(
          'Status',
          evaluation
            ?.status
        );

        row(
          'Technical Fit',
          evaluation
            ?.criteria
            ?.technicalFit
        );

        row(
          'Relevant Experience',
          evaluation
            ?.criteria
            ?.relevantExperience
        );

        row(
          'Communication',
          evaluation
            ?.criteria
            ?.communication
        );

        row(
          'Motivation & Commitment',
          evaluation
            ?.criteria
            ?.motivationCommitment
        );

        row(
          'Learning Potential',
          evaluation
            ?.criteria
            ?.learningPotential
        );

        row(
          'Average Rating',
          evaluation
            ?.averageRating
        );

        row(
          'Weighted Score',
          evaluation
            ?.weightedScore
        );

        row(
          'Recommendation',
          evaluation
            ?.recommendation
        );
      }


      section(
        'Report Information'
      );

      row(
        'Profile Version',
        report
          ?.application
          ?.profileVersion
      );

      row(
        'Generated At',
        displayDate(
          report
            ?.report
            ?.generatedAt
        )
      );

      row(
        'Generated By',
        report
          ?.report
          ?.generatedBy
          ?.name
      );

      row(
        'Generator Role',
        report
          ?.report
          ?.generatedBy
          ?.role
      );


      document
        .moveDown(1.2)
        .fontSize(8)
        .fillColor(
          '#6b7280'
        )
        .text(
          'Confidential recruitment document — OMAH internal use.',
          {
            align:
              'center',
          }
        );

      document.end();
    }
  );
}


module.exports = {
  renderApplicantSummaryPdf,
};
