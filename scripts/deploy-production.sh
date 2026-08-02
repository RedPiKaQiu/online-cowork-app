#!/usr/bin/env sh
set -eu
test -f .env.production
npx --yes pnpm@10.32.1 install --frozen-lockfile
npx --yes pnpm@10.32.1 lint
npx --yes pnpm@10.32.1 typecheck
npx --yes pnpm@10.32.1 test
npx --yes pnpm@10.32.1 build
docker compose -f docker-compose.app.yml --profile tools run --rm migrate
docker compose -f docker-compose.app.yml up -d --build app
curl -fsS http://127.0.0.1:3000/api/health/ready
