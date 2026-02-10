# ExtensionShield Database – Schema, Mapping & API Routes

This document is the single reference for database schema, SQLite vs Postgres (Supabase) mapping, and how API routes use the DB. Use it for prod, staging, and dev setup.

---

## 1. Overview

| Environment | Backend | Where schema lives |
|-------------|--------|---------------------|
| **Dev / local** | SQLite | `src/extension_shield/api/database.py` (`Database.init_database()`) |
| **Staging / prod** | Postgres (Supabase) | `supabase/migrations/*.sql` (single source of truth) |

- **SQLite**: Used when `DB_BACKEND` is unset or not `"supabase"`, or when Supabase env vars are missing. Path: `DATABASE_PATH` (default `project-atlas.db`).
- **Supabase**: Used when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set (and optionally `DB_BACKEND=supabase`). Schema is applied via **Supabase CLI** (`supabase db push`) or the **Python runner** (`scripts/run_supabase_migrations.py`) using `supabase/migrations/`.

---

## 2. Tables (canonical list)

| Table | Purpose | SQLite | Postgres (Supabase) |
|-------|---------|--------|----------------------|
| **scan_results** | Global scan cache (keyed by `extension_id`) | ✅ | ✅ |
| **user_scan_history** | Per-user scan history; references `auth.users` | ✅ | ✅ |
| **page_views_daily** | Daily page view counts (no PII) | ✅ | ✅ |
| **statistics** | Aggregated metrics (total_scans, etc.) | ✅ | ✅ |
| **user_profiles** | Karma and total_scans per user | — | ✅ only |

- **user_profiles** exists only in Postgres; it is created by migrations and updated by a trigger on `user_scan_history` (karma increment).

---

## 3. Schema mapping: SQLite ↔ Postgres

### 3.1 scan_results

| SQLite (database.py) | Postgres (supabase/migrations) | Notes |
|----------------------|-------------------------------|-------|
| `id INTEGER PRIMARY KEY AUTOINCREMENT` | — | Postgres uses `extension_id` as PK only |
| `extension_id TEXT UNIQUE NOT NULL` | `extension_id text PRIMARY KEY` | Same meaning |
| `timestamp TEXT NOT NULL` | `scanned_at timestamptz NOT NULL` | API maps `scanned_at` → `timestamp` in responses |
| `metadata TEXT` | `metadata jsonb` | JSON stored as text (SQLite) vs JSONB (Postgres) |
| `manifest TEXT` | `manifest jsonb` | Same |
| `permissions_analysis TEXT` | `permissions_analysis jsonb` | Same |
| `sast_results TEXT` | `sast_results jsonb` | Same |
| `webstore_analysis TEXT` | `webstore_analysis jsonb` | Same |
| `summary TEXT` | `summary jsonb` | Same |
| `extracted_files TEXT` | `extracted_files jsonb` | Same |
| `icon_path TEXT` | `icon_path text` | **Relative path** to PNG (e.g. `icons/128.png`) for `/api/scan/icon/{id}` |
| `risk_level TEXT` | `risk_level text` | In Supabase Schema Visualizer it may show as int4; actual type is **text** |
| `created_at TEXT` | `created_at timestamptz` | — |
| `updated_at TEXT` | `updated_at timestamptz` | Trigger-updated in Postgres |

All other columns (`extension_name`, `url`, `status`, `security_score`, `total_findings`, `total_files`, `high_risk_count`, `medium_risk_count`, `low_risk_count`, `extracted_path`, `error`) align by name and meaning.

### 3.2 user_scan_history

| SQLite | Postgres | Notes |
|--------|----------|-------|
| `id TEXT PRIMARY KEY` | `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` | Different types |
| `user_id TEXT NOT NULL` | `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` | Postgres ties to Supabase Auth |
| `extension_id text`, `created_at text` | Same names, `created_at timestamptz` | — |

### 3.3 page_views_daily

| SQLite | Postgres |
|--------|----------|
| `day TEXT`, `path TEXT`, `count INTEGER` | Same; `PRIMARY KEY (day, path)` in both |

### 3.4 statistics

| SQLite | Postgres |
|--------|----------|
| `id INTEGER PRIMARY KEY AUTOINCREMENT` | `id bigserial PRIMARY KEY` |
| `metric_name TEXT UNIQUE NOT NULL`, `metric_value INTEGER`, `updated_at TEXT` | Same semantics; `updated_at timestamptz` |

### 3.5 user_profiles (Postgres only)

- `user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `karma_points integer`, `total_scans integer`, `created_at`, `updated_at`
- Filled/updated by trigger `user_scan_history_increment_karma` on `user_scan_history` INSERT.

---

## 4. API routes and database usage

| API route / behavior | Tables / backend used |
|----------------------|------------------------|
| `GET /api/scan/results/{extension_id}` | **scan_results** (SQLite or Supabase) |
| `GET /api/scan/icon/{extension_id}` | **scan_results** (`extracted_path`, `icon_path`); icon_path is **relative**; file served from disk |
| `GET /api/scan/status/{extension_id}` | In-memory + **scan_results** |
| `POST /api/scan/trigger`, `POST /api/scan/upload` | Writes **scan_results**; optionally **user_scan_history** (when authenticated) |
| `GET /api/history?limit=N` | **user_scan_history** + **scan_results** (join by extension_id) |
| `GET /api/recent?limit=N` | **scan_results** (completed, ordered by scanned_at / timestamp) |
| `GET /api/statistics` | **statistics** (SQLite) or computed from **scan_results** (Supabase) |
| `GET /api/user/karma` | **user_profiles** (Supabase only) |
| `DELETE /api/scan/{extension_id}` | **scan_results** |
| `POST /api/clear` | **scan_results** (bulk delete) |
| Telemetry (page views) | **page_views_daily** + RPC `increment_page_view(p_day, p_path)` (Postgres) or direct INSERT (SQLite) |
| `GET /api/health` (DB check) | **scan_results**, **user_scan_history**, **page_views_daily**, **statistics** (existence/columns) |

---

## 5. Migrations (single source of truth)

- **Location**: `supabase/migrations/` only.  
  Do **not** add migrations under `docs/`; the old `docs/supabase_migrations/` has been removed to avoid duplicates.

- **Naming**: Supabase CLI format: `YYYYMMDDHHMMSS_description.sql` (e.g. `20260205000000_scan_results.sql`).

- **Applying (same steps on staging and production)**  
  Use the same script for both environments so schema is identical:

  **Production:**
  ```bash
  ./scripts/supabase_push_env.sh prod
  ```
  (Uses `SUPABASE_PROJECT_REF` if set; default `exmwrsrwhzvxcnhcflwb`.)

  **Staging:**
  ```bash
  export SUPABASE_STAGING_REF=<your-staging-project-ref>
  ./scripts/supabase_push_env.sh staging
  ```
  Or pass the ref directly: `./scripts/supabase_push_env.sh <project-ref>`.

  The script runs `supabase link --project-ref <ref>` then `supabase db push` (same migrations in both). For non-interactive (e.g. CI): `SUPABASE_DB_PUSH_YES=1 ./scripts/supabase_push_env.sh prod`.

  **Alternative (no CLI, e.g. CI with DATABASE_URL):**  
  `python scripts/run_supabase_migrations.py`  
  (reads from `supabase/migrations/`, tracks in `public.schema_migrations`.)

- **Lint**: `python scripts/lint_migrations.py` (validates `supabase/migrations/` filenames and order).

---

## 6. Local dev with Supabase Postgres (validate against prod)

To use the same Postgres schema locally as prod (consistent, validate before deploy):

1. **Add to `.env`:**
   ```bash
   DB_BACKEND=supabase
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```
   (Use the same project as prod, or a staging project for isolation.)

2. **Apply migrations** (if needed): `./scripts/supabase_push_env.sh prod`

3. **Validate** that local pulls from Postgres:
   ```bash
   make validate-postgres
   ```
   This queries `scan_results` directly and prints sample rows. Confirms connection and schema consistency.

4. **Run API**: `make api` — the backend will read/write `scan_results` from Supabase. Data on `/scan` and `/scan/history` comes from Postgres.

---

## 7. Running exactly on staging and production

Use the same flow for both so schema stays in sync:

| Step | Staging | Production |
|------|---------|------------|
| 1 | Create a Supabase project for staging (or reuse one) | Use project `exmwrsrwhzvxcnhcflwb` (or your prod project) |
| 2 | `SUPABASE_STAGING_REF=<staging-ref> ./scripts/supabase_push_env.sh staging` | `./scripts/supabase_push_env.sh prod` |
| 3 | Same migrations in `supabase/migrations/` are applied to both | Same |

Each run does: **link** that project → **db push** (all migrations). No duplicate migration files; one source of truth in `supabase/migrations/`.

**Full staging walkthrough:** see [STAGING_SETUP.md](STAGING_SETUP.md) (create project, get project ref, push env, configure Railway/staging deployment).

---

## 8. Environment variables (dev / staging / prod)

| Variable | Purpose | Dev | Staging/Prod |
|----------|---------|-----|---------------|
| `DATABASE_PATH` | SQLite file path | Optional (default `project-atlas.db`) | Not used when Supabase |
| `DB_BACKEND` | `"supabase"` to force Supabase | Optional | Set to `supabase` |
| `SUPABASE_URL` | Supabase project URL | Optional | Required for Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase key | Optional | Required for Supabase |
| `SUPABASE_SCAN_RESULTS_TABLE` | Table name for scan results | Optional (default `scan_results`) | Optional |
| `SUPABASE_PROJECT_REF` | Project ref for **prod** (used by `supabase_push_env.sh prod`) | Optional | Default `exmwrsrwhzvxcnhcflwb` |
| `SUPABASE_STAGING_REF` | Project ref for **staging** (used by `supabase_push_env.sh staging`) | Optional | Set when you have a separate staging project |
| `DATABASE_URL` or `PGHOST`/`PGPORT`/… | Direct Postgres (for Python migration script) | Optional | Used by `run_supabase_migrations.py` if set |

---

## 9. Supabase Schema Visualizer notes

- **risk_level**: Shown sometimes as `int4` in the visualizer; in migrations and code it is **text**.
- **icon_path**: Present on `scan_results` (migration `20260206000000_add_icon_path.sql`). If the visualizer omits it, the column still exists; icons are served using this relative path via `/api/scan/icon/{extension_id}`.

---

## 10. Future mapping checklist

When adding or changing schema:

1. **SQLite**: Update `Database.init_database()` in `src/extension_shield/api/database.py` (and any new `ALTER`/index logic).
2. **Postgres**: Add a new file under `supabase/migrations/` with a new timestamp prefix; keep ordering consistent.
3. **API**: Update `SupabaseDatabase` in `database.py` if new columns are read/written (e.g. select list, upsert payload).
4. **Mapping**: Update this README (section 2 and 3) and any route table in section 4.
