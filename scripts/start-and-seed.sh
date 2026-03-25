#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTH_FILE="$ROOT_DIR/secrets/neo4j_auth.txt"

if [[ ! -f "$AUTH_FILE" ]]; then
  echo "Auth file not found: $AUTH_FILE" >&2
  exit 1
fi

PASSWORD="$(cut -d/ -f2- "$AUTH_FILE")"

cd "$ROOT_DIR"

echo "Starting Neo4j Enterprise with Docker Compose..."
docker compose up -d

echo "Waiting for Neo4j to accept Cypher connections..."
for _ in $(seq 1 180); do
  if docker compose exec -T neo4j cypher-shell -d neo4j -u neo4j -p "$PASSWORD" "RETURN 1;" >/dev/null 2>&1; then
    "$ROOT_DIR/scripts/seed-sample-data.sh"
    echo "Neo4j is ready for dashboard use."
    exit 0
  fi
  sleep 5
done

echo "Neo4j did not become ready within 15 minutes." >&2
exit 1
