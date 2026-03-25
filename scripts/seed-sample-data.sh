#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTH_FILE="$ROOT_DIR/secrets/neo4j_auth.txt"
DATA_FILE="$ROOT_DIR/cypher/sample-data.cypher"

if [[ ! -f "$AUTH_FILE" ]]; then
  echo "Auth file not found: $AUTH_FILE" >&2
  exit 1
fi

if [[ ! -f "$DATA_FILE" ]]; then
  echo "Sample data file not found: $DATA_FILE" >&2
  exit 1
fi

PASSWORD="$(cut -d/ -f2- "$AUTH_FILE")"

cd "$ROOT_DIR"
echo "Loading sample graph into database 'neo4j'..."
docker compose exec -T neo4j cypher-shell -d neo4j -u neo4j -p "$PASSWORD" < "$DATA_FILE"
echo "Sample data loaded."

