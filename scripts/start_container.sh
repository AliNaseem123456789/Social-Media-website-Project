#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/app}"
AWS_REGION="${AWS_REGION:-us-east-1}"
cd "$APP_DIR"

if [ -f .deploy.env ]; then
  set -a
  . ./.deploy.env
  set +a
fi

: "${ECR_REGISTRY:?ECR_REGISTRY is not set (expected in .deploy.env or the environment)}"

for file in backend/.env email-microservice/.env; do
  if [ ! -f "$file" ]; then
    echo "Missing $APP_DIR/$file. Create it from the matching .env.example before deploying." >&2
    exit 1
  fi
done

aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

docker compose pull
docker compose run --rm --no-deps api npx prisma migrate deploy
docker compose up -d --remove-orphans
docker image prune -f

docker compose ps
