# Scan Results & Dashboard Data Flow

This document describes how scan results are stored and displayed across `/scan`, `/scan/results/[id]`, and `/scan/history`.

---

## 1. Where scan results are stored

| Backend | Storage | When used |
|---------|---------|-----------|
| **Postgres (Supabase)** | `scan_results` table | When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set |
| **SQLite** | `project-atlas.db` (or `DATABASE_PATH`) | Dev fallback when Supabase is not configured |

When a scan completes, `db.save_scan_result()` is called. This writes to Postgres when Supabase is configured; otherwise SQLite.

---

## 2. API endpoints and usage

| Endpoint | Method | Auth | Used by | Purpose |
|----------|--------|------|---------|---------|
| `/api/recent` | GET | No | ScannerPage (dashboard) | Global recent scans, sorted by time (newest first) |
| `/api/history` | GET | Yes (when Supabase) | ScanHistoryPage | User-scoped scan history |
| `/api/scan/results/{id}` | GET | No | ScanResultsPageV2, ReportDetailPage | Full scan result for a specific extension |

---

## 3. Sorting by time

- **`/api/recent`**: Backend returns rows ordered by `timestamp DESC` (SQLite) or `scanned_at DESC` (Postgres). The dashboard table displays this order by default.
- **`/api/history`**: Returns user's scans ordered by `created_at DESC`.
- **ScannerPage**: Default sort is `{ key: "timestamp", direction: "desc" }` — most recent first.

---

## 4. Data flow for `/scan` dashboard

1. On mount, ScannerPage calls `databaseService.getRecentScans(25)` → `GET /api/recent?limit=25`
2. Backend: `db.get_recent_scans(limit)` reads from `scan_results` (Postgres or SQLite)
3. Response includes `risk_and_signals`, `metadata`, `scoring_v2` (when available)
4. Frontend enriches scans via `enrichScans(history, { skipFullFetch: true })` to compute signals
5. Table renders with extensions sorted by time (newest first)

---

## 5. Data flow for `/scan/results/[id]`

1. User navigates to `/scan/results/pjafcgbpdclmdeiipolenjgkikeldlji`
2. ScanResultsPageV2 calls `loadResultsById(scanId)` from ScanContext
3. `loadResultsById` fetches `GET /api/scan/results/{id}` 
4. Backend looks up: memory → db (Postgres/SQLite) → file fallback
5. Payload is normalized and rendered

---

## 6. Scan history (authenticated users)

- **`/scan/history`**: Uses `GET /api/history?limit=N` with `Authorization: Bearer <token>`
- Backend joins `user_scan_history` with `scan_results` by `extension_id`
- Returns only scans the user has run (user-scoped)

---

## 7. Extension icons (extraction and display)

### 7.1 Extraction from manifest

Icons are taken from the **extracted** extension’s `manifest.json`:

1. **Location**: After a scan, the extension is unpacked under `extensions_storage/extracted_<id>.crx_<pid>/`. The backend reads `manifest.json` from that directory.
2. **Manifest field**: Chrome uses an `icons` object, e.g. `"icons": { "16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png" }`.
3. **Backend logic** (`extract_icon_path()` in `main.py`): Reads `manifest["icons"]`, picks the **largest available size** in order (128 → 64 → 48 → 32 → 16 → 96 → 256 → 38 → 19), checks that the file exists under the extracted path, and returns the **relative path** (e.g. `icons/128.png`).
4. **Storage**: That relative path is stored in `scan_results.icon_path`; the folder path is stored as `extracted_path` (relative to `EXTENSION_STORAGE_PATH`). So the icon is **not** stored as base64 in the DB; the API serves the file from disk when requested.

### 7.2 Serving the icon (API)

- **Endpoint**: `GET /api/scan/icon/{extension_id}`  
- **Behavior**: Loads `extracted_path` and `icon_path` from the DB (or in-memory cache). Resolves `extracted_path` under `EXTENSION_STORAGE_PATH`, then serves the file at `extracted_path/icon_path` (e.g. `extensions_storage/extracted_xxx/icons/128.png`). If `icon_path` is missing, it falls back to common paths (`icons/128.png`, `icons/48.png`, etc.).  
- **Response**: PNG file with cache headers (or 404 if the extension dir or icon file is missing on that server).

### 7.3 Frontend rendering

- **URL**: The frontend uses `getExtensionIconUrl(extensionId)` (in `utils/constants.js`), which returns:
  - **With `VITE_API_URL` set** (e.g. local dev): `http://localhost:8007/api/scan/icon/{id}` — browser requests the API directly.
  - **With `VITE_API_URL` unset** (e.g. production or same-origin): `/api/scan/icon/{id}` — same-origin request to the backend.
- **`<img>`**: The scan table and result page set `src` to that URL. On **error** (404 or network failure), `onError` sets `src` to **`EXTENSION_ICON_PLACEHOLDER`** (the base64 SVG puzzle icon) so a placeholder always shows instead of a broken image.

### 7.4 Why icons show in production but not in local frontend

| Environment | What happens | Result |
|-------------|--------------|--------|
| **Production** (app served from backend on 8007) | Same origin: `src="/api/scan/icon/xxx"` → request goes to the same server. Backend has (or had) the extracted extension on disk, so it serves the PNG. | Real icons. |
| **Local frontend** (Vite on 5173) | `src` is `/api/scan/icon/xxx` (no `VITE_API_URL`) → browser asks 5173 → Vite **proxies** `/api` to 8007. If the backend is **not running**, or the icon returns **404** (e.g. that extension was never scanned on this machine, so the extracted folder is missing), the request fails and the frontend shows the **placeholder** (base64 SVG). | Placeholder when API is down or icon 404. |

So **yes, this is expected**: production has the backend and (for scanned extensions) the extracted files on the same host, so icons load. Locally, icons only load if (1) the backend is running on 8007 and (2) the proxy is used (no `VITE_API_URL`) or `VITE_API_URL=http://localhost:8007` is set, and (3) the backend has the extracted folder for that extension (e.g. you ran the scan on this machine). Otherwise you see the placeholder.

**Optional for local**: In `frontend/.env` or `frontend/.env.local`, set `VITE_API_URL=http://localhost:8007` so icon (and other API) requests go straight to the backend. Then start both the API (`make api`) and the frontend (`make frontend`); icons will show for any extension that has been scanned on this machine and still has its extracted folder under `extensions_storage`.

---

## 8. Summary

- **Postgres**: Used when Supabase is configured; scan results are stored in `scan_results`
- **Dashboard**: `/scan` shows recent scans from `GET /api/recent`, already sorted by time
- **No new API needed**: The existing `/api/recent` and `/api/history` serve the dashboard and scan history
- **UI**: ScanResultsPageV2 transition was improved to avoid flash of "Unable to Display" during normalization
- **Icons**: Extracted from manifest `icons` (relative path stored in DB), served by `GET /api/scan/icon/{id}` from extracted folder; production shows real icons when backend has the files; local shows placeholders when API is unreachable or icon 404
