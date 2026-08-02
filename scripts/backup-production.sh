#!/usr/bin/env sh
set -eu
mkdir -p backups
docker compose -f docker-compose.db.yml exec -T postgres pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > "backups/${POSTGRES_DB}-$(date +%F-%H%M%S).dump"
chmod 600 backups/*.dump
