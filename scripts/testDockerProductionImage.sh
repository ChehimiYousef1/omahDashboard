#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

IMAGE_TAG="omah-dashboard:p11b-$(git rev-parse --short HEAD)"
CONTAINER_NAME="omah-p11b-smoke-$$"
TEST_DB="omahconnect_p11b_container_smoke_$$"
TMP_DATA="$(mktemp -d /tmp/omah-p11b-data.XXXXXX)"
LOG_FILE="$(mktemp /tmp/omah-p11b-container.XXXXXX.log)"

PORT="$(
  node - <<'NODE'
const net = require('net');
const server = net.createServer();
server.listen(0, '127.0.0.1', () => {
  console.log(server.address().port);
  server.close();
});
NODE
)"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

  MONGODB_URI="mongodb://127.0.0.1:27017/$TEST_DB" \
    node - <<'NODE' >/dev/null 2>&1 || true
const mongoose = require('mongoose');

(async () => {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 2000,
  });
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
})().catch(() => process.exit(0));
NODE

  rm -rf "$TMP_DATA"
  rm -f "$LOG_FILE"
}

trap cleanup EXIT

echo "=== Docker production image build ==="

docker build \
  --build-arg VITE_API_URL=/api \
  --tag "$IMAGE_TAG" \
  .

echo "✅ Image built: $IMAGE_TAG"

echo
echo "=== Image content safety ==="

docker run \
  --rm \
  --entrypoint sh \
  "$IMAGE_TAG" \
  -c '
    set -eu

    test ! -e /app/.env
    test ! -e /app/omahconnect-admin/.env
    test ! -e /app/omahconnect-admin/.env.production

    if find /app/data -mindepth 1 -type f | grep -q .; then
      echo "Runtime data unexpectedly baked into image."
      exit 1
    fi

    if find /app/private-storage -mindepth 1 -type f | grep -q .; then
      echo "Private documents unexpectedly baked into image."
      exit 1
    fi

    test -f /app/omahconnect-admin/dist/index.html
  '

echo "✅ No .env, runtime JSON data, or private documents baked into image"
echo "✅ Built frontend exists"

echo
echo "=== Local MongoDB prerequisite ==="

MONGODB_URI="mongodb://127.0.0.1:27017/$TEST_DB" \
  node - <<'NODE'
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 3000,
  });

  console.log('✅ Local MongoDB reachable for isolated container smoke');

  await mongoose.disconnect();
})().catch((error) => {
  console.error('❌ Local MongoDB is required for /ready container smoke');
  console.error(error.message);
  process.exit(1);
});
NODE

echo
echo "=== Prepare isolated writable legacy-data mount ==="

# Copy the current local JSON-store shape to an isolated temp directory.
# The source files are never mounted and cannot be changed by the container.
cp -a data/. "$TMP_DATA"/

chmod -R a+rwX "$TMP_DATA"

echo "✅ Temporary data copy prepared"
echo "✅ Source data directory is not mounted"

echo
echo "=== Start production-mode container ==="

docker run \
  --detach \
  --name "$CONTAINER_NAME" \
  --network host \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --mount "type=bind,src=$TMP_DATA,dst=/app/data" \
  --env NODE_ENV=production \
  --env PORT="$PORT" \
  --env "MONGODB_URI=mongodb://127.0.0.1:27017/$TEST_DB" \
  --env "JWT_SECRET=P11B_CONTAINER_SMOKE_ONLY_0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ" \
  --env "ALLOWED_ORIGINS=https://container-smoke.invalid" \
  --env ALLOW_SIGNUP=false \
  --env SWAGGER_ENABLED=false \
  --env DEV_API_ENABLED=false \
  --env DISABLE_MONGO=false \
  --env DOCUMENT_STORAGE_PROVIDER=s3 \
  --env DOCUMENT_S3_BUCKET=omah-p11b-smoke-placeholder \
  --env AWS_REGION=us-east-1 \
  --env DOCUMENT_S3_FORCE_PATH_STYLE=false \
  --env APPLICANT_AUTO_SYNC_ENABLED=false \
  --env APPLICANT_SYNC_WRITE_ENABLED=false \
  --env GOOGLE_CALENDAR_ENABLED=false \
  --env GOOGLE_CALENDAR_WRITE_ENABLED=false \
  --env GOOGLE_CALENDAR_SEND_UPDATES=none \
  --env GOOGLE_DRIVE_DOCUMENT_IMPORT_ENABLED=false \
  --env INTERVIEW_EMAIL_ENABLED=false \
  --env WHATSAPP_CLOUD_ENABLED=false \
  "$IMAGE_TAG" \
  > /dev/null

echo "Container: $CONTAINER_NAME"
echo "Port:      $PORT"

for _ in $(seq 1 60); do
  if curl \
    --silent \
    --fail \
    "http://127.0.0.1:$PORT/ready" \
    >/dev/null 2>&1
  then
    break
  fi

  if ! docker inspect \
    --format '{{.State.Running}}' \
    "$CONTAINER_NAME" 2>/dev/null |
    grep -qx true
  then
    docker logs "$CONTAINER_NAME" >"$LOG_FILE" 2>&1 || true
    cat "$LOG_FILE"
    echo "❌ Production container exited before becoming ready"
    exit 1
  fi

  sleep 1
done

HEALTH="$(
  curl \
    --silent \
    --show-error \
    --write-out '\n%{http_code}' \
    "http://127.0.0.1:$PORT/health"
)"

READY="$(
  curl \
    --silent \
    --show-error \
    --write-out '\n%{http_code}' \
    "http://127.0.0.1:$PORT/ready"
)"

ROOT_HTTP="$(
  curl \
    --silent \
    --output /tmp/omah-p11b-root-$$.html \
    --write-out '%{http_code}' \
    "http://127.0.0.1:$PORT/"
)"

DOCS_HTTP="$(
  curl \
    --silent \
    --output /dev/null \
    --write-out '%{http_code}' \
    "http://127.0.0.1:$PORT/api-docs"
)"

DEV_HTTP="$(
  curl \
    --silent \
    --output /dev/null \
    --write-out '%{http_code}' \
    "http://127.0.0.1:$PORT/api/dev"
)"

HEADERS="$(
  curl \
    --silent \
    --dump-header - \
    --output /dev/null \
    "http://127.0.0.1:$PORT/"
)"

rm -f /tmp/omah-p11b-root-$$.html

echo
echo "Health:"
echo "$HEALTH"

echo
echo "Ready:"
echo "$READY"

echo
echo "Root HTTP:      $ROOT_HTTP"
echo "Swagger HTTP:   $DOCS_HTTP"
echo "Developer HTTP: $DEV_HTTP"

echo "$HEALTH" | tail -1 | grep -qx '200'
echo "$READY" | tail -1 | grep -qx '200'
[ "$ROOT_HTTP" = "200" ]
[ "$DOCS_HTTP" = "404" ]
[ "$DEV_HTTP" = "404" ]

if echo "$HEADERS" |
  grep -qi '^X-Powered-By:'
then
  echo "❌ X-Powered-By must not be exposed"
  exit 1
fi

echo "$HEADERS" |
  grep -qi '^Content-Security-Policy:'

echo "✅ /health 200"
echo "✅ /ready 200 with isolated MongoDB"
echo "✅ frontend 200"
echo "✅ Swagger production boundary 404"
echo "✅ Developer API production boundary 404"
echo "✅ CSP present"
echo "✅ X-Powered-By absent"

echo
echo "=== Container user / filesystem ==="

CONTAINER_USER="$(
  docker exec "$CONTAINER_NAME" id -u
)"

[ "$CONTAINER_USER" = "10001" ]

echo "✅ Container runs as UID 10001"

docker exec "$CONTAINER_NAME" \
  sh -c 'test -w /app/data && test -w /tmp'

echo "✅ Intended writable mounts are writable"

echo
echo "P11B DOCKER PRODUCTION IMAGE SMOKE PASSED"
echo "Image retained locally: $IMAGE_TAG"
