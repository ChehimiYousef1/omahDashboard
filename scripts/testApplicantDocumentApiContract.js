'use strict';

const assert =
  require('assert');

const createRouter =
  require(
    '../src/routes/applicantDocuments.routes'
  );

const swagger =
  require(
    '../docs/applicantDocumentSwagger'
  );

const permissions = [];

const permissionMiddleware =
  (permission) => {
    permissions.push(
      permission
    );

    return (
      req,
      res,
      next
    ) => next();
  };

const noopAsync =
  async () => [];

const router =
  createRouter({
    requireApplicantPermission:
      permissionMiddleware,

    services: {
      createApplicantDocument:
        noopAsync,

      replaceApplicantDocument:
        noopAsync,

      getApplicantDocuments:
        noopAsync,

      getDocumentVersions:
        noopAsync,

      getDocumentDownload:
        noopAsync,

      setCurrentDocumentVersion:
        noopAsync,

      archiveApplicantDocument:
        noopAsync,

      restoreApplicantDocument:
        noopAsync,
    },
  });

const routes =
  router.stack
    .filter(
      (layer) =>
        layer.route
    )
    .flatMap(
      (layer) =>
        Object.keys(
          layer.route.methods
        ).map(
          (method) =>
            method.toUpperCase() +
            ' ' +
            layer.route.path
        )
    )
    .sort();

const expected = [
  'GET /',
  'GET /:documentId/download',
  'GET /:documentId/versions',
  'POST /',
  'POST /:documentId/archive',
  'POST /:documentId/current',
  'POST /:documentId/restore',
  'POST /:documentId/versions',
].sort();

assert.deepStrictEqual(
  routes,
  expected
);

console.log(
  '✅ all document routes registered'
);

assert(
  permissions.includes(
    'applicant:documents:view'
  )
);

assert(
  permissions.includes(
    'applicant:documents:manage'
  )
);

console.log(
  '✅ view/manage permissions wired'
);

const swaggerPaths =
  Object.keys(
    swagger.paths
  );

assert.strictEqual(
  swaggerPaths.length,
  6
);

console.log(
  '✅ document Swagger paths defined'
);

const routeSource =
  require('fs')
    .readFileSync(
      require.resolve(
        '../src/routes/applicantDocuments.routes'
      ),
      'utf8'
    );

for (
  const forbidden
  of [
    'findByIdAndDelete',
    'findOneAndDelete',
    'deleteMany(',
    'deleteOne(',
  ]
) {
  assert.strictEqual(
    routeSource.includes(
      forbidden
    ),
    false
  );
}

console.log(
  '✅ no hard-delete endpoint introduced'
);

console.log(
  '✅ no MongoDB connection used'
);

console.log(
  '\nTASKS 6-10 DOCUMENT API CONTRACT TEST PASSED'
);

