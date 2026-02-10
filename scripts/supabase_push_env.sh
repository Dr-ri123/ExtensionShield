#!/usr/bin/env sh
# Run the same Supabase link + db push for a given environment (staging or prod).
# Usage:
#   ./scripts/supabase_push_env.sh prod
#   ./scripts/supabase_push_env.sh staging
#   ./scripts/supabase_push_env.sh <project-ref>   # e.g. exmwrsrwhzvxcnhcflwb
#
# Env (optional):
#   SUPABASE_PROJECT_REF   - used for "prod" (default: exmwrsrwhzvxcnhcflwb)
#   SUPABASE_STAGING_REF  - used for "staging" (must set for staging)
#   SUPABASE_DB_PUSH_YES  - set to non-empty to auto-confirm db push (e.g. in CI)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Resolve project ref from first argument
ARG="${1:?Usage: $0 prod|staging|<project-ref>}"

if [ "$ARG" = "prod" ]; then
  REF="${SUPABASE_PROJECT_REF:-exmwrsrwhzvxcnhcflwb}"
  ENV_LABEL="production"
elif [ "$ARG" = "staging" ]; then
  REF="${SUPABASE_STAGING_REF:?Set SUPABASE_STAGING_REF for staging (or pass project ref: $0 <ref>)}"
  ENV_LABEL="staging"
else
  REF="$ARG"
  ENV_LABEL="project $REF"
fi

echo "=============================================="
echo "Supabase: $ENV_LABEL (ref: $REF)"
echo "=============================================="

# Prefer npx so it works without global supabase CLI
SUPABASE_CMD="npx supabase"
if command -v supabase >/dev/null 2>&1; then
  SUPABASE_CMD="supabase"
fi

echo "→ Linking project..."
$SUPABASE_CMD link --project-ref "$REF"

echo "→ Pushing migrations..."
if [ -n "${SUPABASE_DB_PUSH_YES}" ]; then
  echo "y" | $SUPABASE_CMD db push
else
  $SUPABASE_CMD db push
fi

echo "✅ Done for $ENV_LABEL."
