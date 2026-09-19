'use strict';


/*
|--------------------------------------------------------------------------
| Health / Readiness
|--------------------------------------------------------------------------
|
| /health
|   Liveness only. It does not expose database state.
|
| /ready
|   Confirms MongoDB is connected and ready to serve traffic.
|
*/


function registerHealthRoutes(
  app,
  {
    mongoConnection,
  }
) {
  app.get(
    '/health',
    (req, res) => {
      res.setHeader(
        'Cache-Control',
        'no-store'
      );

      return res
        .status(200)
        .json({
          status:
            'ok',
        });
    }
  );


  app.get(
    '/ready',
    (req, res) => {
      res.setHeader(
        'Cache-Control',
        'no-store'
      );


      const connection =
        mongoConnection
          .getConnection();


      const databaseReady =
        connection &&
        connection.readyState ===
          1;


      if (!databaseReady) {
        return res
          .status(503)
          .json({
            status:
              'not_ready',

            database:
              'unavailable',
          });
      }


      return res
        .status(200)
        .json({
          status:
            'ready',

          database:
            'connected',
        });
    }
  );
}


module.exports = {
  registerHealthRoutes,
};
