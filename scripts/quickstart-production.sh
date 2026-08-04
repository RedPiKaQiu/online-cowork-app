#!/usr/bin/env sh
set -eu
test -f .env.production || { echo "Missing .env.production; copy .env.production.example first." >&2; exit 1; }
docker compose -f docker-compose.prod.yml up -d --build
until curl -fsS http://127.0.0.1:3000/api/health/ready; do sleep 2; done
