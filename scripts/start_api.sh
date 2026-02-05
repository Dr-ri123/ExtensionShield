#!/bin/sh
set -e

if [ -n "${DB_BACKEND:-}" ] && [ "${DB_BACKEND:-}" != "supabase" ]; then
  echo "Skipping Supabase migrations: DB_BACKEND=${DB_BACKEND}"
elif [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "Running Supabase migrations..."
  python scripts/run_supabase_migrations.py
else
  echo "Skipping Supabase migrations: Supabase env not set"
fi

exec uvicorn extension_shield.api.main:app --host 0.0.0.0 --port "${PORT:-8007}"

