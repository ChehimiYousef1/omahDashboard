'use strict';

const PDFDocument =
  require('pdfkit');


function value(
  input
) {
  if (
    input === undefined ||
    input === null ||
    input === ''
  ) {
    return '—';
  }

  if (Array.isArray(input)) {
    return input.length
      ? input.join(', ')
      : '—';
  }

  if (
    typeof input ===
      'boolean'
  ) {
    return input
      ? 'Yes'
      : 'No';
  }

  return String(input);
}


function dateValue(
  input
) {
  if (!input) {
    return '—';
  }

  const date =
    new Date(input);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return date
    .toISOString()
    .replace('T', ' ')
    .replace(
      /\.\d{3}Z$/,
      ' UTC'
    );
}


function renderApplicantRecruitmentPdf(
  report
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const doc =
        new PDFDocument({
          size:
            'A4',

          margins: {
            top: 45,
            right: 48,
            bottom: 48,
            left: 48,
          },

          info: {
            Title:
              'OMAH Recruitment Report',

            Author:
              'OMAH Recruitment',

            Subject:
              'Applicant recruitment assessment report',
          },
        });

      const chunks = [];

      doc.on(
        'data',
        chunk =>
          chunks.push(chunk)
      );

      doc.on(
        'error',
        reject
      );

      doc.on(
        'end',
        () =>
          resolve(
            Buffer.concat(
              chunks
            )
          )
      );


      function ensureSpace(
        height = 70
      ) {
        if (
          doc.y +
            height >
          doc.page.height -
            doc.page.margins.bottom
        ) {
          doc.addPage();
        }
      }


      function section(
        title
      ) {
        ensureSpace(65);

        doc
          .moveDown(0.7)
          .font(
            'Helvetica-Bold'
          )
          .fontSize(12)
          .fillColor(
            '#111827'
          )
          .text(title);

        doc
          .moveDown(0.2)
          .strokeColor(
            '#d1d5db'
          )
          .moveTo(
            doc.page
              .margins.left,
            doc.y
          )
          .lineTo(
            doc.page.width -
              doc.page
                .margins.right,
            doc.y
          )
          .stroke();

        doc.moveDown(0.45);
      }


      function row(
        label,
        input
      ) {
        ensureSpace(32);

        const left =
          doc.page
            .margins.left;

        const labelWidth =
          160;

        const contentWidth =
          doc.page.width -
          doc.page.margins.left -
          doc.page.margins.right -
          labelWidth;

        const startY =
          doc.y;

        doc
          .font(
            'Helvetica-Bold'
          )
          .fontSize(9)
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

        doc
          .font(
            'Helvetica'
          )
          .fillColor(
            '#111827'
          )
          .text(
            value(input),
            left +
              labelWidth,
            startY,
            {
              width:
                contentWidth,
            }
          );

        doc.y =
          Math.max(
            doc.y,
            startY + 15
          );
      }


      doc
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

      doc
        .moveDown(0.15)
        .fontSize(16)
        .text(
          'Recruitment Report'
        );

      doc
        .moveDown(0.35)
        .font(
          'Helvetica'
        )
        .fontSize(10)
        .fillColor(
          '#4b5563'
        )
        .text(
          value(
            report
              ?.candidate
              ?.fullName
          )
        );

      doc.text(
        `Generated: ${dateValue(
          report
            ?.report
            ?.generatedAt
        )}`
      );


      section(
        'Candidate Overview'
      );

      row(
        'Full Name',
        report
          ?.candidate
          ?.fullName
      );

      row(
        'Email',
        report
          ?.candidate
          ?.email
      );

      row(
        'Phone',
        report
          ?.candidate
          ?.phone
      );

      row(
        'Location',
        [
          report
            ?.candidate
            ?.city,
          report
            ?.candidate
            ?.country,
        ]
          .filter(Boolean)
          .join(', ')
      );


      section(
        'Application & Recruitment Status'
      );

      row(
        'Applicant Code',
        report
          ?.recruitment
          ?.applicantCode
      );

      row(
        'Position Track',
        report
          ?.preferences
          ?.positionTrack
      );

      row(
        'Position Type',
        report
          ?.preferences
          ?.positionType
      );

      row(
        'Current Status',
        report
          ?.recruitment
          ?.status
      );

      row(
        'Application Source',
        report
          ?.recruitment
          ?.source
      );

      row(
        'First Applied',
        dateValue(
          report
            ?.recruitment
            ?.firstAppliedAt
        )
      );

      row(
        'Last Applied',
        dateValue(
          report
            ?.recruitment
            ?.lastAppliedAt
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
        dateValue(
          report
            ?.education
            ?.graduationDate
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
        'Soft Skills',
        report
          ?.skills
          ?.softSkills
      );

      row(
        'Experience Level',
        report
          ?.skills
          ?.technicalExperienceLevel
      );

      row(
        'Professional Experience',
        report
          ?.skills
          ?.professionalExperience
      );


      section(
        'Availability & Preferences'
      );

      row(
        'Available Start',
        dateValue(
          report
            ?.preferences
            ?.availableStartDate
        )
      );

      row(
        'Duration',
        report
          ?.preferences
          ?.duration
      );

      row(
        'Weekly Availability',
        report
          ?.preferences
          ?.weeklyAvailability
      );

      row(
        'Working Days',
        report
          ?.preferences
          ?.workingDays
      );

      row(
        'Working Time',
        report
          ?.preferences
          ?.workingTime
      );

      row(
        'Can Commit',
        report
          ?.preferences
          ?.canCommit
      );

      row(
        'Objectives',
        report
          ?.preferences
          ?.objectives
      );


      section(
        'Interview History'
      );

      const interviews =
        Array.isArray(
          report?.interviews
        )
          ? report.interviews
          : [];

      if (!interviews.length) {
        row(
          'Interviews',
          'No active interview history'
        );
      }

      interviews.forEach(
        (
          interview,
          index
        ) => {
          ensureSpace(120);

          doc
            .font(
              'Helvetica-Bold'
            )
            .fontSize(10)
            .fillColor(
              '#111827'
            )
            .text(
              `Interview ${index + 1}`
            );

          row(
            'Type',
            interview.type
          );

          row(
            'Status',
            interview.status
          );

          row(
            'Format',
            interview.format
          );

          row(
            'Scheduled',
            dateValue(
              interview
                .scheduledStart
            )
          );

          row(
            'Outcome',
            interview.outcome
          );

          doc.moveDown(0.35);
        }
      );


      section(
        'Evaluation History'
      );

      const evaluations =
        Array.isArray(
          report?.evaluations
        )
          ? report.evaluations
          : [];

      if (!evaluations.length) {
        row(
          'Evaluations',
          'No active evaluation history'
        );
      }

      evaluations.forEach(
        (
          evaluation,
          index
        ) => {
          ensureSpace(210);

          doc
            .font(
              'Helvetica-Bold'
            )
            .fontSize(10)
            .fillColor(
              '#111827'
            )
            .text(
              `Evaluation ${index + 1}`
            );

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
            evaluation.status
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

          row(
            'Submitted',
            dateValue(
              evaluation
                ?.submittedAt
            )
          );

          doc.moveDown(0.35);
        }
      );


      section(
        'Recruitment Assessment Summary'
      );

      row(
        'Interview Count',
        report
          ?.assessment
          ?.interviewCount
      );

      row(
        'Evaluation Count',
        report
          ?.assessment
          ?.evaluationCount
      );

      row(
        'Latest Average Rating',
        report
          ?.assessment
          ?.latestAverageRating
      );

      row(
        'Latest Weighted Score',
        report
          ?.assessment
          ?.latestWeightedScore
      );

      row(
        'Latest Recommendation',
        report
          ?.assessment
          ?.latestRecommendation
      );


      section(
        'Report Information'
      );

      row(
        'Profile Version',
        report
          ?.recruitment
          ?.profileVersion
      );

      row(
        'Generated At',
        dateValue(
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

      doc
        .moveDown(1)
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

      doc.end();
    }
  );
}


module.exports = {
  renderApplicantRecruitmentPdf,
};
