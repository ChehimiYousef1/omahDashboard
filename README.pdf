# OMAH Connect — Admin Dashboard

Express + MongoDB back end with a React (Vite) admin console.

## Layout

    server.js              API entry point
    models/                Mongoose models
    middleware/            auth
    data/                  JSON stores (companies, jobs, emails, users…)
    scripts/               ops: backup, audits, structure, cleanup
    omahconnect-admin/     React admin front end
    docs/archive/          historical setup notes

## Requirements

Node 20+, MongoDB 8 running locally (or an Atlas connection string).

## Setup

    npm install
    cp .env.example .env        # then fill it in
    npm start                   # API on :5000

    cd omahconnect-admin
    npm install
    npm run dev                 # UI on :5173

## Environment

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Mongo connection string (required) |
| `DISABLE_MONGO` | `true` falls back to JSON files |
| `JWT_SECRET` | 64 hex chars, required |
| `PORT` | API port, default 5000 |
| `SMTP_*` | outbound email |
| `APPLICANT_SHEET_CSV_URL` | Google Sheet import |

Front end: `VITE_API_URL` in `omahconnect-admin/.env` (and `.env.production`).

## Useful commands

    npm run backup      # Mongo + data/ snapshot
    npm run tree        # project structure
    npm run clean       # remove build junk (dry run first)
    bash scripts/security-audit.sh
