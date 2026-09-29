#!/usr/bin/env bash
# Builds and starts the stack on the instance. Safe to re-run: this is also how you deploy an update.
#
#   ./scripts/ec2-deploy.sh          # build what changed, migrate, restart
#   ./scripts/ec2-deploy.sh --pull   # git pull first, then the same
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f docker-compose.ec2.yml"

log() { printf '\n== %s\n' "$1"; }

if [ "${1:-}" = "--pull" ]; then
  log "fetching the latest commit"
  git pull --ff-only
fi

log "checking what the deploy needs"
missing=0
for file in backend/.env email-microservice/.env .env; do
  if [ ! -f "$file" ]; then
    echo "  missing $file" >&2
    missing=1
  fi
done
if [ "$missing" -eq 1 ]; then
  cat >&2 <<'EOF'

  backend/.env and email-microservice/.env come from the .env.example beside each of them.
  .env (next to docker-compose.ec2.yml) needs two lines:

    API_DOMAIN=api.example.com
    ACME_EMAIL=you@example.com
EOF
  exit 1
fi

if ! swapon --show | grep -q .; then
  echo "  no swap is active. Run scripts/ec2-bootstrap.sh first, or the build will be killed." >&2
  exit 1
fi

log "building images"
# Building is the memory-hungry part, so nothing else should be competing with it.
$COMPOSE build

log "applying database migrations"
# Runs inside the API image against DATABASE_URL from backend/.env. Additive migrations only, and
# re-running is a no-op, so this is safe on every deploy.
$COMPOSE run --rm --no-deps api npx prisma migrate deploy

log "starting containers"
$COMPOSE up -d --remove-orphans

log "cleaning up build layers"
docker image prune -f >/dev/null
docker builder prune -f >/dev/null

log "state"
$COMPOSE ps
echo
free -h

log "waiting for the api to report healthy"
for i in $(seq 1 30); do
  state=$(docker inspect -f '{{.State.Health.Status}}' circle-api 2>/dev/null || echo unknown)
  if [ "$state" = "healthy" ]; then
    echo "  api is healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "  api is still $state after 60s. Logs:" >&2
    $COMPOSE logs --tail 40 api >&2
    exit 1
  fi
  sleep 2
done

log "checks worth reading"
docker exec circle-api node scripts/db-doctor.js 2>/dev/null | tail -20 || true
cat <<'EOF'

If TLS is not working yet, check that API_DOMAIN resolves to this instance and that ports 80 and 443
are open, then: docker compose -f docker-compose.ec2.yml logs caddy
EOF
