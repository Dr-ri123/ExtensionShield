# Schema & Auth Verification (master)

Verification that the Supabase schema, user-scoped scan history, and `/scan` / `/scan/history` flows are correctly placed and mapped.

---

## 1. Schema in correct place

- **Source of truth:** `supabase/migrations/` (Supabase CLI format `YYYYMMDDHHMMSS_description.sql`).
- **Applied via:** `supabase link --project-ref <ref>` + `supabase db push` (same migrations for staging and prod). See [STAGING_SETUP.md](STAGING_SETUP.md) and [DATABASE_README.md](DATABASE_README.md).

Tables present in migrations and in Schema Visualizer (production):

| Table | Migration(s) | Purpose |
|-------|--------------|---------|
| **scan_results** | `20260205000000_scan_results.sql`, `20260205000001_rename_timestamp_to_scanned_at.sql`, `20260206000000_add_icon_path.sql` | Global scan cache; keyed by `extension_id`. Full scan payload (manifest, sast_results, summary, etc.). |
| **user_scan_history** | `20260205000002_user_scan_history.sql` | Per-user history; `user_id` → `auth.users(id)`, `extension_id` links to `scan_results`. |
| **user_profiles** | `20260206025727_initial_declarative_schema.sql`, `20260206031453_add_user_profiles_karma.sql` | Karma and total_scans; `user_id` → `auth.users(id)`; updated by trigger on `user_scan_history` INSERT. |
| **page_views_daily** | `20260205000003_page_views_daily.sql` | Daily page view counts (no PII). |
| **statistics** | `20260205000005_statistics.sql` | Aggregated metrics. |

**Note:** In Schema Visualizer, `risk_level` may appear as `int4`; in migrations it is **text**. `icon_path` is added in `20260206000000_add_icon_path.sql` (relative path for `/api/scan/icon/{id}`).

---

## 2. User login and authenticated scan history

- **Auth:** Supabase Auth. `user_profiles` and `user_scan_history` both reference `auth.users(id)` via `user_id`.
- **Backend:** JWT from `Authorization: Bearer <access_token>` is verified in `supabase_auth.py`; middleware sets `request.state.user_id` (from JWT `sub`).  
- **History API:** `GET /api/history` uses `request.state.user_id` and calls `db.get_user_scan_history(user_id, limit)`.  
  - **When Supabase is used (staging + prod):** No token or invalid token → **401** “Sign in to view history”.  
  - **When SQLite is used (local):** No auth required; returns global `get_scan_history` for easier dev.
- **Saving history:** On scan completion (trigger/upload), backend calls `db.add_user_scan_history(user_id, extension_id)` when `request.state.user_id` is set (best-effort; anonymous scans are not saved).

So: after sign-in, users only see scan history they created; history is stored in `user_scan_history` and joined to `scan_results` by `extension_id`.

---

## 3. `/scan/history` – behind authentication (same idea as /scan for history)

- **Route:** `/scan/history` → `ScanHistoryPage` (no route-level guard; page handles auth UX).
- **Frontend logic:**
  - `canLoadHistory = isAuthenticated || !supabaseConfigured`. When Supabase is configured (`VITE_SUPABASE_URL`), only authenticated users trigger `GET /api/history` (with `accessToken`). Unauthenticated users do not get history data.
  - Empty state: if not authenticated and no history, shows “Sign in to view your scan history” and “Sign In” button.
  - If unauthenticated users ever had data (e.g. from cache), table is shown with `blurred-content` and a “Sign in to view scanned extensions” overlay.
- **Backend:** With Supabase, `GET /api/history` returns **401** when there is no valid user (so staging and prod behave the same). With SQLite, unauthenticated callers get global history for local testing.

So: in staging/prod, only logged-in users can see their scan history; the table and data are effectively hidden behind sign-in.

- **/scan (scanner):** The scanner page itself is not gated; anyone can open it. Only “view my history” and “save to my history” are auth-gated.

---

## 4. Entire scanned extensions in table format at `/scan/history`

- **Data source:** `GET /api/history` returns items from `user_scan_history` joined to `scan_results` (in backend: `get_user_scan_history` fetches history rows then enriches from `scan_results` by `extension_id`). Each item includes extension fields (e.g. `extension_name`, `security_score`, `risk_level`, `summary`, `report_view_model`, etc.).
- **Frontend:** `ScanHistoryPage` displays this in a table (sortable, searchable, paginated) with extension icon, name, risk, signals, evidence count, etc., and links to `/scan/results/:scanId` for full report.
- **Same shape as /scan:** History table uses the same enrichment and design patterns as the scanner/recent scans (e.g. `enrichScans`, risk/signal mapping). Logged-in users see their “entire” scanned extensions in this table.

---

## 5. Mapping checklist

| Area | Status |
|------|--------|
| Schema in `supabase/migrations/` | ✅ Single source of truth; applied to staging and prod. |
| `scan_results` | ✅ Global cache; `scanned_at`; JSONB fields; `icon_path` in migration. |
| `user_scan_history` ↔ `auth.users` | ✅ `user_id` FK to `auth.users(id)`; RLS select/insert/delete own. |
| `user_profiles` ↔ `auth.users` | ✅ `user_id` FK; karma/trigger from `user_scan_history`. |
| `GET /api/history` | ✅ User-scoped when Supabase; 401 when Supabase and no auth. |
| Frontend history | ✅ Token sent; empty/sign-in state when not authenticated; overlay when Supabase. |
| Scan → save to history | ✅ `add_user_scan_history` on trigger/upload when `user_id` present. |
| `/scan/results/:id` access | ✅ User can only open results for extensions in their history (or in-progress scan). |

---

## 6. Staging vs prod (history auth)

- Previously, `GET /api/history` only required auth when `env == "prod"`, so staging could return global history without auth.
- **Update:** History now requires auth whenever the DB is **Supabase** (`isinstance(db, SupabaseDatabase)`). So both staging and prod require sign-in to view history; only SQLite/local allows unauthenticated global history for testing.
