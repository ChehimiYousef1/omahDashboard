'use strict';

const swaggerUi =
  require(
    'swagger-ui-express'
  );

const applicantSwaggerSpec =
  require(
    '../../docs/applicantSwagger'
  );

const applicantDocumentSwagger =
  require(
    '../../docs/applicantDocumentSwagger'
  );

const applicantReportSwagger =
  require(
    '../../docs/applicantReportSwagger'
  );


const applicantTalentPoolSwagger =
  require(
    '../../docs/applicantTalentPoolSwagger'
  );


/*
|--------------------------------------------------------------------------
| OMAH Applicant API Documentation
|--------------------------------------------------------------------------
|
| Swagger composition belongs here rather than in server.js.
|
| Individual API domains may continue owning their own Swagger documents.
| This bootstrap layer is responsible only for combining and exposing them.
|
*/


function buildApplicantSwaggerSpec() {
  return {
    ...applicantSwaggerSpec,

    paths: {
      ...(
        applicantSwaggerSpec.paths ||
        {}
      ),

      ...(
        applicantDocumentSwagger.paths ||
        {}
      ),

        ...(
          applicantReportSwagger.paths ||
          {}
        ),


        ...(
          applicantTalentPoolSwagger.paths ||
          {}
        ),
    },

    tags: [
      ...(
        applicantSwaggerSpec.tags ||
        []
      ),

      ...(
        applicantDocumentSwagger.tags ||
        []
      ),

        ...(
          applicantReportSwagger.tags ||
          []
        ),


        ...(
          applicantTalentPoolSwagger.tags ||
          []
        ),
    ],
  };
}


function swaggerDocsCsp(
  req,
  res,
  next
) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
  );

  return next();
}


function registerSwagger(
  app,
  {
    authenticateToken,
    requireAdmin,
  }
) {
  const swaggerSpec =
    buildApplicantSwaggerSpec();

  app.use(
    '/api-docs',

    authenticateToken,

    requireAdmin,

    swaggerDocsCsp,

    swaggerUi.serve,

    swaggerUi.setup(
      swaggerSpec,
      {
        customSiteTitle:
          'OMAH Applicant API',
      }
    )
  );

  return swaggerSpec;
}


module.exports = {
  buildApplicantSwaggerSpec,
  registerSwagger,
  swaggerDocsCsp,
};
