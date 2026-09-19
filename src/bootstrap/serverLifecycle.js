'use strict';


/*
|--------------------------------------------------------------------------
| Server Lifecycle
|--------------------------------------------------------------------------
|
| Owns:
|
| - application storage initialization
| - HTTP listener startup
| - Applicant Form automatic synchronization gate
| - HTTP server startup failures
| - SIGTERM / SIGINT handling
| - graceful HTTP shutdown
| - MongoDB disconnect
|
| Requiring this module has no runtime side effects.
| Lifecycle behavior starts only when startServerLifecycle()
| is explicitly called by server.js.
|
*/


function isEnvEnabled(
  value
) {
  return (
    String(
      value ||
      ''
    )
      .trim()
      .toLowerCase() ===
    'true'
  );
}


function startServerLifecycle({
  app,

  applicationStore,

  mongoConnection,

  syncApplicantsFromSheet,

  env = process.env,

  runtimeProcess = process,

  logger = console,
}) {
  let httpServer =
    null;

  let isShuttingDown =
    false;


  /*
   * Applicant synchronization remains
   * explicitly protected by TWO write gates.
   */
  function runApplicantAutoSync() {
    const autoSyncEnabled =
      isEnvEnabled(
        env
          .APPLICANT_AUTO_SYNC_ENABLED
      );


    const writeEnabled =
      isEnvEnabled(
        env
          .APPLICANT_SYNC_WRITE_ENABLED
      );


    if (!autoSyncEnabled) {
      logger.log(
        '📋 Applicant sheet auto-sync: disabled'
      );

      return;
    }


    if (!writeEnabled) {
      logger.warn(
        '⚠️ Applicant sheet auto-sync not started because APPLICANT_SYNC_WRITE_ENABLED=false'
      );

      return;
    }


    /*
     * Never fall back to a historical or
     * hardcoded Google Sheet URL.
     */
    const sheetUrl =
      env
        .APPLICANT_SHEET_CSV_URL;


    if (!sheetUrl) {
      logger.warn(
        '⚠️ Applicant sheet auto-sync skipped: APPLICANT_SHEET_CSV_URL is not configured.'
      );

      return;
    }


    /*
     * Auto-sync only reaches a real write after:
     *
     * APPLICANT_AUTO_SYNC_ENABLED=true
     * APPLICANT_SYNC_WRITE_ENABLED=true
     */
    syncApplicantsFromSheet(
      sheetUrl,
      {
        dryRun:
          false,
      }
    )
      .then(
        result => {
          logger.log(
            `📋 Applicant sheet sync: imported ${result.inserted} new applicant(s)`
          );

          logger.log(
            `📋 Applicant sheet sync: skipped ${result.duplicates} duplicate(s)`
          );

          logger.log(
            `📋 Applicant sheet sync: ${result.invalid} invalid response(s), ${result.failed} failed row(s)`
          );
        }
      )
      .catch(
        error => {
          logger.warn(
            '⚠️ Applicant sheet auto-sync skipped:',
            error.message
          );
        }
      );
  }


  async function startServer() {
    /*
     * Initialize application persistence
     * before accepting HTTP traffic.
     */
    await applicationStore.init(
      mongoConnection
    );


    const PORT =
      env.PORT ||
      5000;


    httpServer =
      app.listen(
        PORT,
        () => {
          logger.log(
            `🚀 Server running on port ${PORT}`
          );


          logger.log(
            `📦 Applications storage: ${
              applicationStore
                .isUsingMongo()
                ? 'MongoDB'
                : 'JSON file (data/applications.json)'
            }`
          );


          runApplicantAutoSync();
        }
      );


    /*
     * Handles asynchronous listener failures,
     * including EADDRINUSE.
     */
    httpServer.once(
      'error',
      async error => {
        logger.error(
          'HTTP server error:',
          error?.code ||
          error?.message ||
          'UNKNOWN_ERROR'
        );


        try {
          await mongoConnection
            .disconnect();
        } catch {
          /*
           * Startup failure is already being
           * handled. Do not mask it with a
           * secondary disconnect failure.
           */
        }


        runtimeProcess.exit(
          1
        );
      }
    );


    return httpServer;
  }


  async function shutdownServer(
    signal
  ) {
    /*
     * Signal handlers may be triggered more
     * than once during deployment.
     */
    if (isShuttingDown) {
      return;
    }


    isShuttingDown =
      true;


    logger.log(
      `${signal} received. Shutting down gracefully...`
    );


    /*
     * Prevent a deployment from hanging
     * indefinitely during shutdown.
     */
    const forceShutdownTimer =
      setTimeout(
        () => {
          logger.error(
            'Graceful shutdown timed out.'
          );


          if (
            httpServer &&
            typeof httpServer
              .closeAllConnections ===
              'function'
          ) {
            httpServer
              .closeAllConnections();
          }


          runtimeProcess.exit(
            1
          );
        },
        10000
      );


    forceShutdownTimer
      .unref();


    try {
      if (
        httpServer &&
        httpServer.listening
      ) {
        await new Promise(
          (
            resolve,
            reject
          ) => {
            httpServer.close(
              error => {
                if (error) {
                  reject(
                    error
                  );

                  return;
                }


                resolve();
              }
            );
          }
        );


        logger.log(
          '✅ HTTP server closed'
        );
      }


      await mongoConnection
        .disconnect();


      logger.log(
        '✅ MongoDB disconnected'
      );


      clearTimeout(
        forceShutdownTimer
      );


      logger.log(
        '✅ Graceful shutdown complete'
      );


      runtimeProcess.exit(
        0
      );
    } catch (error) {
      clearTimeout(
        forceShutdownTimer
      );


      logger.error(
        'Shutdown error:',
        error?.message ||
        'UNKNOWN_ERROR'
      );


      runtimeProcess.exit(
        1
      );
    }
  }


  /*
   * Preserve one-time signal semantics.
   */
  runtimeProcess.once(
    'SIGTERM',
    () => {
      void shutdownServer(
        'SIGTERM'
      );
    }
  );


  runtimeProcess.once(
    'SIGINT',
    () => {
      void shutdownServer(
        'SIGINT'
      );
    }
  );


  /*
   * Preserve the original startup failure
   * behavior.
   */
  void startServer()
    .catch(
      error => {
        logger.error(
          'Failed to start server:',
          error?.message ||
          'UNKNOWN_ERROR'
        );


        runtimeProcess.exit(
          1
        );
      }
    );


  /*
   * Exposed primarily for controlled testing
   * and future lifecycle instrumentation.
   */
  return {
    getHttpServer:
      () =>
        httpServer,

    shutdownServer,
  };
}


module.exports = {
  isEnvEnabled,
  startServerLifecycle,
};
