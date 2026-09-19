'use strict';

const nodemailer =
  require('nodemailer');


/*
|--------------------------------------------------------------------------
| Mail Transport
|--------------------------------------------------------------------------
|
| Centralizes construction of the application's SMTP transport.
|
| Credentials continue to come exclusively from environment variables.
|
*/


function createMailer(
  env = process.env
) {
  return nodemailer.createTransport({
    host:
      env.SMTP_HOST ||
      'smtp.gmail.com',

    port:
      parseInt(
        env.SMTP_PORT ||
          '587',
        10
      ),

    secure:
      env.SMTP_SECURE ===
      'true',

    auth: {
      user:
        env.SMTP_USER ||
        '',

      pass:
        env.SMTP_PASS ||
        '',
    },
  });
}


module.exports = {
  createMailer,
};
