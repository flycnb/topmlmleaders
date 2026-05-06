#!/usr/bin/env bash
# Apply TopMLMLeaders Supabase SQL from this repo.
#
# Usage:
#   export DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
#   ./scripts/setup.sh
#
# DATABASE_URL is the "Connection string" → URI from Supabase (Session mode or Direct).
# Optional: SUPABASE_DB_URL as an alias for DATABASE_URL.
#
# Order:
#   1. supabase/schema.sql  (full idempotent schema + seed)
#   2. supabase/migrations/*.sql  (lexical order; additive changes)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"

if [[ -z "$DB_URL" ]]; then
  if [[ -f .env ]]; then
    # shellcheck disable=SC1091
    set -a && source .env && set +a
    DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"
  fi
fi

if [[ -z "$DB_URL" ]]; then
  echo "Missing DATABASE_URL (or SUPABASE_DB_URL)." >&2
  echo "Get it from Supabase → Project Settings → Database → Connection string (URI)." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is not installed. Install PostgreSQL client tools, e.g.:" >&2
  echo "  brew install libpq && brew link --force libpq" >&2
  exit 1
fi

run_sql() {
  local f="$1"
  echo "→ $f"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"
}

run_sql "$ROOT/supabase/schema.sql"

if [[ -d "$ROOT/supabase/migrations" ]]; then
  shopt -s nullglob
  for f in $(ls -1 "$ROOT/supabase/migrations"/*.sql 2>/dev/null | sort); do
    run_sql "$f"
  done
  shopt -u nullglob
fi

echo "Done. Storage: create bucket \"avatars\" + policies in Dashboard or Storage API — see supabase/migrations/*storage*."
