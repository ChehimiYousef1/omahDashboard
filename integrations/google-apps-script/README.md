# OMAH Google Apps Script Integration

This directory contains the Google Apps Script bridge used by the
Applicant Form integration.

## Purpose

`Code.gs` receives Google Form submission events and forwards normalized
Applicant data to the OMAH backend webhook.

It also contains utilities for:

- validating the OMAH webhook connection;
- inspecting installed Apps Script triggers;
- diagnosing the Google Form integration.

## Secrets

Secrets must not be stored directly in `Code.gs`.

Runtime configuration such as the webhook secret must be stored using
Google Apps Script `PropertiesService` / Script Properties.

The corresponding backend secret must remain in the backend production
secret store or environment configuration.

## Deployment

This file is not executed by Node.js.

It must be deployed separately in the relevant Google Apps Script
project associated with the Applicant Google Form.

Changes to this integration should therefore be reviewed and deployed
independently from the Node.js/AWS application deployment.
