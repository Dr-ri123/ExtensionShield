# API & Supabase Implementation – Complete Reference

This document describes what is implemented for **production** (Supabase project `exmwrsrwhzvxcnhcflwb`): Supabase config, API endpoints, and how they map to **Task 1 (User login and Get Two scans)** so data is sent and rendered on prod.

---

## 1. Supabase production config (from dashboard)

### 1.1 Tables (public schema)

| Table | Columns (count) | Purpose |
|-------|-----------------|---------|
| **scan_results** | 24 | Global scan cache; PK `extension_id`; includes `scanned_at`, `icon_path`, `risk_level`, JSONB fields |
| **user_scan_history** | 4 | Per-user scan history; `user_id` → `auth.users(id)`; `extension_id`, `created_at` |
| **user_profiles** | 5 | Karma and totals per user; `user_id` PK, `karma_points`, `total_scans`, `created_at`, `updated_at` |
| **page_views_daily** | 3 | Telemetry: `day`, `path`, `count`; PK `(day, path)` |
| **statistics** | 4 | Aggregated metrics; `metric_name`, `metric_value`, etc. |

### 1.2 Functions (public schema)

| Function | Arguments | Return | Security | Purpose |
|----------|------------|--------|----------|---------|
| **increment_page_view** | `p_day text`, `p_path text` | `integer` | Definer | Atomic upsert on `page_views_daily`; used by telemetry API |
| **increment_user_karma** | (trigger) | `trigger` | Definer | Called by trigger on `user_scan_history` INSERT; upserts `user_profiles` |
| **update_updated_at_column** | (trigger) | `trigger` | Invoker | Sets `updated_at` on row update |

### 1.3 Triggers

| Trigger | Table | Function | When | Purpose |
|---------|--------|----------|------|---------|
| **scan_results_updated_at** | scan_results | update_updated_at_column | BEFORE UPDATE | Keep `updated_at` in sync |
| **user_profiles_updated_at** | user_profiles | update_updated_at_column | BEFORE UPDATE | Same for user_profiles |
| **user_scan_history_increment_karma** | user_scan_history | increment_user_karma | AFTER INSERT | One new scan → increment user karma/total_scans |

### 1.4 Indexes

| Table | Index | Columns | Purpose |
|-------|--------|---------|---------|
| page_views_daily | idx_page_views_day | day | Filter by day |
| page_views_daily | page_views_daily_pkey | day, path | PK |
| scan_results | idx_risk_level | risk_level | Filter by risk |
| scan_results | idx_scanned_at | scanned_at | Recent scans |
| scan_results | scan_results_pkey | extension_id | PK |
| user_profiles | idx_user_profiles_karma | karma_points | Leaderboard / sort |
| user_profiles | user_profiles_pkey | user_id | PK |
| statistics | statistics_metric_name_key | metric_name | Unique metric |
| statistics | statistics_pkey | id | PK |
| user_scan_history | user_scan_history_user_created_at_idx | user_id, created_at | User history by time |
| user_scan_history | user_scan_history_pkey | id | PK |

### 1.5 Enumerated types

- **public** schema: none. All enums (e.g. risk_level) are stored as `text`.

---

## 2. Task 1: User login and Get Two scans

### 2.1 User login (implemented)

- **Where:** Frontend uses **Supabase Auth** (OAuth or email/password). Session is stored in the client; the frontend sends the Supabase **access token** in the `Authorization: Bearer <token>` header to the backend.
- **Backend:**  
  - **Middleware** (`attach_user_context`): On every request, reads `Authorization` header, verifies the JWT via Supabase JWKS, and sets `request.state.user_id` to the JWT `sub` (or `None` if missing/invalid).  
  - No separate “login” endpoint on the backend; login is handled entirely by Supabase Auth on the frontend. The backend only **validates** the token and uses `user_id` for protected routes.

**Endpoints that require a signed-in user (401 if no valid token):**

| Endpoint | Purpose |
|----------|---------|
| `GET /api/history?limit=N` | User’s scan history (from `user_scan_history` + `scan_results`). In prod, returns 401 if not signed in. |
| `GET /api/user/karma` | User’s karma and total scans (from `user_profiles`). Returns 401 if not signed in. |

**Endpoints that use user_id when present (optional auth):**

- `POST /api/scan/trigger` / `POST /api/scan/upload`: If `request.state.user_id` is set, the backend records this scan in `user_scan_history` (and trigger updates `user_profiles`).
- `GET /api/scan/results/{extension_id}`: When user is set, ownership is checked so users only see their own scans when applicable.

So: **User login** = Supabase Auth on frontend + backend JWT verification and `request.state.user_id`; **fully implemented and able to send/use identity on prod.**

### 2.2 Get Two scans (implemented)

“Get Two scans” is satisfied by either (or both) of:

**A) User’s own history (two most recent scans)**  
- **Endpoint:** `GET /api/history?limit=2`  
- **Headers:** `Authorization: Bearer <supabase_access_token>`  
- **Backend:** Reads `request.state.user_id` → `db.get_user_scan_history(user_id, limit=2)` → Supabase `user_scan_history` + `scan_results` (join by `extension_id`), returns list of 2 scan objects in history order.  
- **Response:** `{ "history": [ ... ], "total": N }`; each item has scan fields (extension_id, security_score, risk_level, summary, etc.) so the UI can render two scans.

**B) Global recent scans (e.g. first two)**  
- **Endpoint:** `GET /api/recent?limit=2`  
- **Backend:** `db.get_recent_scans(limit=2)` → reads from `scan_results` (completed, ordered by `scanned_at` desc). No auth required.  
- **Response:** Array of up to 2 recent scans with risk/signals; can be rendered on landing or dashboard.

**Data flow on prod:**

1. Frontend: user signs in with Supabase Auth → gets access token.  
2. Frontend: calls `GET /api/history?limit=2` with `Authorization: Bearer <token>`.  
3. Backend: middleware verifies token → `request.state.user_id` = JWT `sub`.  
4. Backend: `get_user_scan_history(user_id, limit=2)` → Supabase `user_scan_history` (by user_id, order by created_at desc, limit 2) then fetches those rows from `scan_results` by `extension_id`.  
5. Backend: returns `{ "history": [ scan1, scan2 ], "total": 2 }`.  
6. Frontend: renders the two scans (e.g. ScanHistoryPage, dashboard cards).

So: **Get Two scans** is **fully implemented**; the API can send the data and the frontend can render it on prod (using existing ScanHistoryPage or any consumer of `/api/history`).

---

## 3. Task 2

*(Task 2 was not specified in the request. When defined, add here: required behavior, endpoints, and DB usage.)*

---

## 4. Complete API endpoint list (backend)

All endpoints below are defined in `src/extension_shield/api/main.py`. Auth = “Optional” if the route works without a token but uses `request.state.user_id` when present; “Required” if it returns 401 without a valid token.

| Method | Path | Auth | Tables / RPC | Purpose |
|--------|------|------|------------------|---------|
| GET | `/` | — | — | SPA / landing |
| GET | `/robots.txt` | — | — | SEO |
| GET | `/api/limits/deep-scan` | Optional | — | Deep scan limit status (in-memory + user_id) |
| POST | `/api/enterprise/pilot-request` | Optional | — | Pilot form submit |
| POST | `/api/scan/trigger` | Optional | scan_results, user_scan_history (if user_id) | Start scan by URL |
| POST | `/api/scan/upload` | Optional | scan_results, user_scan_history (if user_id) | Start scan by file upload |
| GET | `/api/scan/status/{extension_id}` | — | in-memory, scan_results | Scan status |
| GET | `/api/scan/results/{extension_id}` | Optional | scan_results, user_scan_history | Full scan result; ownership check when user set |
| GET | `/api/scan/enforcement_bundle/{extension_id}` | Optional | scan_results | Enforcement bundle |
| GET | `/api/scan/report/{extension_id}` | Optional | scan_results | PDF report |
| GET | `/api/scan/files/{extension_id}` | Optional | scan_results | File list under extracted path |
| GET | `/api/scan/file/{extension_id}/{file_path:path}` | Optional | scan_results | Single file content |
| GET | `/api/statistics` | — | statistics (SQLite) or scan_results (Supabase) | Aggregated stats |
| POST | `/api/telemetry/pageview` | — | page_views_daily, increment_page_view | Page view count |
| GET | `/api/telemetry/summary` | — | page_views_daily | Telemetry summary |
| GET | `/api/history?limit=N` | **Required (prod)** | user_scan_history, scan_results | **Task 1: user’s scan history (e.g. 2 scans)** |
| GET | `/api/user/karma` | **Required** | user_profiles | Karma and total_scans |
| GET | `/api/recent?limit=N` | — | scan_results | **Task 1 (alt): recent scans (e.g. limit=2)** |
| GET | `/api/diagnostic/scans` | — | scan_results / in-memory | Diagnostics |
| DELETE | `/api/scan/{extension_id}` | — | scan_results | Delete one scan |
| POST | `/api/clear` | — | scan_results | Clear all scans |
| GET | `/health` | — | — | Liveness |
| GET | `/api/health/db` | — | scan_results, user_scan_history, page_views_daily, statistics | DB health |
| GET | `/api/scan/icon/{extension_id}` | — | scan_results (extracted_path, icon_path) | Extension icon (relative path) |
| GET | `/{full_path:path}` | — | — | SPA catch-all |

---

## 5. Frontend → backend auth (prod)

1. **Login:** User signs in via Supabase Auth (e.g. AuthContext); Supabase returns a session with `access_token`.  
2. **Sending identity:** Frontend uses `realScanService.getRequestHeaders()` / `getUserHeaders()` which add `Authorization: Bearer <access_token>` to requests.  
3. **Used by:** `databaseService.getScanHistory(limit, accessToken)` (e.g. ScanHistoryPage, ScanContext), and any other call that uses the same headers (e.g. scan trigger, results).  
4. **Backend:** Middleware verifies token with Supabase JWKS, sets `request.state.user_id`; routes then call `db.get_user_scan_history(user_id, limit)` or `db.get_user_karma(user_id)`.

So for **Task 1**, the API endpoints are **completely defined**, and they **are able to send the data and render it on prod** (user login via Supabase Auth + JWT; get two scans via `GET /api/history?limit=2` or `GET /api/recent?limit=2`).

---

## 6. Summary table (Task 1)

| Requirement | Implemented | Endpoint(s) | DB / behavior |
|-------------|-------------|-------------|----------------|
| User login | Yes | Supabase Auth (frontend); backend validates JWT and sets `user_id` | auth.users (Supabase); request.state.user_id |
| Get user’s two scans | Yes | `GET /api/history?limit=2` + Bearer token | user_scan_history + scan_results |
| Get two recent scans (global) | Yes | `GET /api/recent?limit=2` | scan_results |
| Render on prod | Yes | Same endpoints; frontend uses VITE_API_URL and sends Bearer token | Supabase project exmwrsrwhzvxcnhcflwb (production) |

---

## 7. References

- **Supabase project:** `exmwrsrwhzvxcnhcflwb` (production).  
- **Schema and migrations:** `supabase/migrations/`; see `docs/DATABASE_README.md` for SQLite ↔ Postgres mapping and env vars.  
- **Backend routes:** `src/extension_shield/api/main.py`.  
- **Auth:** `src/extension_shield/api/supabase_auth.py` (JWT verification); frontend `AuthContext`, `realScanService.getUserHeaders()`.  
- **Frontend API usage:** `docs/FRONTEND_OVERVIEW_AND_API_REFERENCE.md`.
