'use strict';

const http =
  require('http');

const GATEWAY_HOST =
  '127.0.0.1';

const GATEWAY_PORT =
  5051;

const BACKEND_HOST =
  '127.0.0.1';

const BACKEND_PORT =
  5000;

const WEBHOOK_PATH =
  '/api/applicant-form/webhook';

const server =
  http.createServer(
    (req, res) => {
      /*
       * Expose ONLY the Form webhook.
       */
      if (
        req.method !== 'POST' ||
        req.url !== WEBHOOK_PATH
      ) {
        res.writeHead(
          404,
          {
            'Content-Type':
              'application/json',
          }
        );

        res.end(
          JSON.stringify({
            success: false,
            error: 'Not found.',
          })
        );

        return;
      }

      const headers = {
        'content-type':
          req.headers[
            'content-type'
          ] ||
          'application/json',

        'x-omah-webhook-secret':
          req.headers[
            'x-omah-webhook-secret'
          ] || '',
      };

      if (
        req.headers[
          'content-length'
        ]
      ) {
        headers[
          'content-length'
        ] =
          req.headers[
            'content-length'
          ];
      }

      const proxy =
        http.request(
          {
            hostname:
              BACKEND_HOST,

            port:
              BACKEND_PORT,

            path:
              WEBHOOK_PATH,

            method:
              'POST',

            headers,
          },

          (backendResponse) => {
            res.writeHead(
              backendResponse
                .statusCode ||
                502,

              {
                'Content-Type':
                  backendResponse
                    .headers[
                      'content-type'
                    ] ||
                  'application/json',
              }
            );

            backendResponse.pipe(
              res
            );
          }
        );

      proxy.on(
        'error',
        () => {
          /*
           * Do not leak backend details.
           */
          res.writeHead(
            502,
            {
              'Content-Type':
                'application/json',
            }
          );

          res.end(
            JSON.stringify({
              success: false,
              error:
                'Webhook backend unavailable.',
            })
          );
        }
      );

      /*
       * Stream instead of buffering.
       * Backend still enforces 64 KB.
       */
      req.pipe(proxy);
    }
  );

server.listen(
  GATEWAY_PORT,
  GATEWAY_HOST,
  () => {
    console.log(
      `✅ Webhook gateway listening on http://${GATEWAY_HOST}:${GATEWAY_PORT}`
    );

    console.log(
      `✅ Only ${WEBHOOK_PATH} is exposed`
    );
  }
);

function shutdown() {
  server.close(
    () => {
      console.log(
        '✅ Webhook gateway stopped'
      );
    }
  );
}

process.on(
  'SIGINT',
  shutdown
);

process.on(
  'SIGTERM',
  shutdown
);
