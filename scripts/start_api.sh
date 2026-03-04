#!/bin/sh
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT"

# Activate virtual environment if it exists
if [ -f ".venv/bin/activate" ]; then
  . .venv/bin/activate
elif [ -f "venv/bin/activate" ]; then
  . venv/bin/activate
fi

echo "🚀 Starting ExtensionShield API..."

# Try to load .env file values for display (Python will load it properly)
if [ -f ".env" ]; then
  # Source .env to get values (but don't export, Python will load it)
  set -a
  . .env 2>/dev/null || true
  set +a
fi

echo "PORT: ${PORT:-8007}"
# Redact Supabase URL (project ref) in logs for security
if [ -n "${SUPABASE_URL:-}" ]; then
  echo "SUPABASE_URL: set (https://***.supabase.co)"
else
  echo "SUPABASE_URL: not set"
fi
echo "LLM_PROVIDER: ${LLM_PROVIDER:-ollama (from .env)}"
if [ -n "${LLM_FALLBACK_CHAIN:-}" ]; then
  echo "LLM_FALLBACK_CHAIN: ${LLM_FALLBACK_CHAIN}"
fi

# Run migrations if Supabase is configured (non-blocking: start API first so healthcheck passes)
if [ -n "${DB_BACKEND:-}" ] && [ "${DB_BACKEND:-}" != "supabase" ]; then
  echo "⏭️  Skipping Supabase migrations: DB_BACKEND=${DB_BACKEND}"
elif [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "🔄 Running Supabase migrations in background (API will start immediately)..."
  (
    python scripts/cloud_only/run_supabase_migrations.py && echo "✅ Migrations completed."
  ) || echo "❌ Migrations failed (app is running; retry on next deploy or run manually)." &
else
  echo "⏭️  Skipping Supabase migrations: Supabase env not set"
fi

echo "✅ Starting uvicorn server on port ${PORT:-8007}..."
exec uvicorn extension_shield.api.main:app --host 0.0.0.0 --port "${PORT:-8007}" --forwarded-allow-ips="*"

