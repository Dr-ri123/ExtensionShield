# ExtensionShield Schema Reference

Consolidated schema for Postgres (Supabase) and SQLite. Single source of truth for dev and prod.

## Summary

| Table | Purpose | Rows (typical) |
|-------|---------|----------------|
| `scan_results` | Global scan cache (extension_id → full result) | 8+ |
| `user_scan_history` | User-scoped scan history (links to scan_results) | 0+ |
| `user_profiles` | User karma, total_scans (Supabase only) | 0+ |
| `page_views_daily` | Privacy-first analytics (day, path, count) | 20+ |
| `statistics` | Aggregate metrics (total_scans, etc.) | 4 |

---

## 1. scan_results

**Purpose:** Global cache of extension scan results. Keyed by `extension_id`.

**Postgres columns:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `extension_id` | text | NOT NULL | Primary key (Chrome extension ID) |
| `extension_name` | text | yes | Display name |
| `url` | text | yes | Chrome Web Store URL |
| `scanned_at` | timestamptz | NOT NULL | **When last scanned** (always updated; use for "recently scanned" display) |
| `first_scanned_at` | timestamptz | yes | When first scanned (set once) |
| `previous_scanned_at` | timestamptz | yes | When scanned before last (for Hot extensions detection) |
| `previous_scan_state` | jsonb | yes | Snapshot of previous metadata for graphing (user_count, rating, etc.) |
| `status` | text | NOT NULL | `completed`, `failed`, `running` |
| `security_score` | int4 | yes | Overall security score |
| `risk_level` | text | yes | `low`, `medium`, `high` |
| `total_findings` | int4 | yes | Total findings count |
| `total_files` | int4 | yes | Files analyzed |
| `high_risk_count` | int4 | yes | High-risk findings |
| `medium_risk_count` | int4 | yes | Medium-risk findings |
| `low_risk_count` | int4 | yes | Low-risk findings |
| `metadata` | jsonb | yes | Extension metadata (title, rating, user_count, etc.) |
| `manifest` | jsonb | yes | Parsed manifest.json |
| `permissions_analysis` | jsonb | yes | Permissions analysis |
| `sast_results` | jsonb | yes | SAST results |
| `webstore_analysis` | jsonb | yes | Webstore metadata |
| `summary` | jsonb | yes | Includes scoring_v2, report_view_model, governance_bundle |
| `extracted_path` | text | yes | Storage-relative path (basename of extracted dir, e.g. `extracted_<id>.crx_123`) so icon endpoint can resolve on any backend |
| `extracted_files` | jsonb | yes | List of extracted files |
| `icon_path` | text | yes | Relative icon path (e.g. `icons/128.png`) |
| `error` | text | yes | Error message if failed |
| `created_at` | timestamptz | NOT NULL | Row creation time |
| `updated_at` | timestamptz | NOT NULL | Row update time (auto via trigger) |

**SQLite:** Uses `timestamp` instead of `scanned_at`; API normalizes to `timestamp` for frontend.

**API → Frontend mapping:**
- `scanned_at` (Postgres) or `timestamp` (SQLite) → `timestamp` in API response
- Fallback: `scanned_at` > `updated_at` > `created_at` for "recently scanned" display

**Indexes:** `idx_scanned_at`, `idx_risk_level`, `scan_results_pkey`

**Trigger:** `scan_results_updated_at` (BEFORE UPDATE) → `update_updated_at_column()`

---

## 2. user_scan_history

**Purpose:** User-scoped scan history. Links user to extension_id; joins with scan_results for full data.

**Columns:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | NOT NULL | Primary key |
| `user_id` | uuid | NOT NULL | FK to auth.users(id) |
| `extension_id` | text | NOT NULL | References scan_results.extension_id |
| `created_at` | timestamptz | NOT NULL | When user added to history |

**Indexes:** `user_scan_history_user_created_at_idx (user_id, created_at DESC)`

**Trigger:** `user_scan_history_increment_karma` (AFTER INSERT) → `increment_user_karma()`

---

## 3. user_profiles

**Purpose:** User karma and scan stats. Used for recommendations (thumbs up/down) — **future feature**.

**Columns:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `user_id` | uuid | NOT NULL | Primary key, FK to auth.users(id) |
| `karma_points` | int4 | NOT NULL | Karma for recommending extensions (future: thumbs up/down) |
| `total_scans` | int4 | NOT NULL | User's total scans |
| `created_at` | timestamptz | NOT NULL | Profile creation |
| `updated_at` | timestamptz | NOT NULL | Profile update |

**Indexes:** `idx_user_profiles_karma`, `user_profiles_pkey`

**Trigger:** `user_profiles_updated_at` (BEFORE UPDATE) → `update_updated_at_column()`

**Karma flow:** `user_scan_history` INSERT → `increment_user_karma()` → upsert into `user_profiles` (karma_points +1, total_scans +1).

**API:** `GET /api/user/karma` (auth required) returns `karma_points`, `total_scans`.

---

## 4. page_views_daily

**Purpose:** Privacy-first analytics (day, path, count). No PII.

**Columns:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `day` | text | NOT NULL | YYYY-MM-DD |
| `path` | text | NOT NULL | URL path |
| `count` | int4 | NOT NULL | View count |

**Primary key:** `(day, path)`

**Indexes:** `idx_page_views_day`

**RPC:** `increment_page_view(p_day, p_path)` — atomic upsert.

---

## 5. statistics

**Purpose:** Aggregate metrics.

**Columns:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | int8 | NOT NULL | Primary key |
| `metric_name` | text | NOT NULL | Unique metric name |
| `metric_value` | int4 | yes | Value |
| `updated_at` | timestamptz | yes | Last update |

**Default rows:** `total_scans`, `high_risk_extensions`, `total_files_analyzed`, `total_vulnerabilities`

---

## Time field mapping

| Use case | Postgres column | SQLite column | API field |
|----------|-----------------|---------------|-----------|
| When scan ran | `scanned_at` | `timestamp` | `timestamp` |
| Row created | `created_at` | — | — |
| Row updated | `updated_at` | `updated_at` | — |

**Frontend display:** Use `timestamp ?? scanned_at ?? created_at ?? updated_at` for "recently scanned" time.

---

## Migrations

Located in `supabase/migrations/` (timestamp-prefixed):

- `20260205000000_scan_results.sql` — base table
- `20260205000001_rename_timestamp_to_scanned_at.sql` — migration for existing deploys
- `20260205000002_user_scan_history.sql`
- `20260205000003_page_views_daily.sql`
- `20260205000004_increment_page_view_rpc.sql`
- `20260205000005_statistics.sql`
- `20260206000000_add_icon_path.sql`
- `20260206031453_add_user_profiles_karma.sql` — user_profiles, karma trigger
- `20260210200000_scan_time_tracking.sql` — first_scanned_at, previous_scanned_at, previous_scan_state

---

## Validation

```bash
# Postgres/Supabase
make validate-postgres
# or
VALIDATE_EXTENSION_ID=<id> uv run python scripts/validate_postgres_local.py
```
