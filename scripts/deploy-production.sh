#!/usr/bin/env sh
set -eu
test -f .env.production
npx --yes pnpm@10.32.1 install --frozen-lockfile
npx --yes pnpm@10.32.1 lint
npx --yes pnpm@10.32.1 typecheck
npx --yes pnpm@10.32.1 test
npx --yes pnpm@10.32.1 build
set -a; . ./.env.production; set +a
NODE_ENV=production npx --yes pnpm@10.32.1 db:migrate
docker compose -f docker-compose.prod.yml up -d --build
curl -fsS http://127.0.0.1:3000/api/health/ready
