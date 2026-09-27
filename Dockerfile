# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:24-bookworm-slim


# ---------------------------------------------------------------------------
# Frontend build
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS frontend-build

WORKDIR /app

COPY omahconnect-admin/package.json \
     omahconnect-admin/package-lock.json \
     ./omahconnect-admin/

RUN npm ci --prefix omahconnect-admin

COPY omahconnect-admin/ ./omahconnect-admin/

# The first deployment is single-origin. /api keeps the image reusable across
# staging/production domains. It can still be overridden explicitly at build.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build --prefix omahconnect-admin


# ---------------------------------------------------------------------------
# Backend production dependencies
# bcrypt can require a native build path, so compilers exist only here.
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS backend-deps

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 \
       make \
       g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci --omit=dev \
    && npm cache clean --force


# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime

ENV NODE_ENV=production \
    PORT=5000

WORKDIR /app

RUN groupadd --system --gid 10001 nodeapp \
    && useradd \
       --system \
       --uid 10001 \
       --gid 10001 \
       --home-dir /app \
       --shell /usr/sbin/nologin \
       nodeapp \
    && mkdir -p \
       /app/data \
       /app/private-storage \
       /app/scripts \
    && chown -R nodeapp:nodeapp \
       /app/data \
       /app/private-storage \
       /app/scripts

COPY --from=backend-deps \
     --chown=nodeapp:nodeapp \
     /app/node_modules \
     ./node_modules

COPY --chown=nodeapp:nodeapp \
     package.json \
     package-lock.json \
     server.js \
     db.js \
     mongoConnection.js \
     applicationStore.js \
     ./

COPY --chown=nodeapp:nodeapp config ./config
COPY --chown=nodeapp:nodeapp middleware ./middleware
COPY --chown=nodeapp:nodeapp migrations ./migrations
COPY --chown=nodeapp:nodeapp models ./models
COPY --chown=nodeapp:nodeapp services ./services
COPY --chown=nodeapp:nodeapp src ./src
COPY --chown=nodeapp:nodeapp utils ./utils
COPY --chown=nodeapp:nodeapp docs ./docs
COPY --chown=nodeapp:nodeapp integrations ./integrations
COPY --chown=nodeapp:nodeapp scripts/migrate.js ./scripts/migrate.js

COPY --from=frontend-build \
     --chown=nodeapp:nodeapp \
     /app/omahconnect-admin/dist \
     ./omahconnect-admin/dist

USER nodeapp

EXPOSE 5000

STOPSIGNAL SIGTERM

HEALTHCHECK \
  --interval=30s \
  --timeout=5s \
  --start-period=30s \
  --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||'5000')+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
