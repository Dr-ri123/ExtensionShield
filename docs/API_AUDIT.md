# API Endpoints Audit

Single source of truth for backend routes and frontend usage. No duplicates; one canonical endpoint per resource.

## Backend routes (FastAPI `main.py`)

| Method | Path | Purpose | Frontend usage |
|--------|------|---------|----------------|
| GET | `/` | Root / health | — |
| GET | `/robots.txt` | Robots | — |
| GET | `/health` | Health check | — |
| GET | `/api/health/db` | DB connectivity | — |
| GET | `/api/limits/deep-scan` | Deep-scan limit status | `realScanService.getDeepScanLimitStatus()` |
| POST | `/api/enterprise/pilot-request` | Enterprise pilot | `EnterprisePage` |
| POST | `/api/scan/trigger` | Start scan (URL) | `realScanService.triggerScan()` |
| POST | `/api/scan/upload` | Start scan (file) | Upload CRX/ZIP flow |
| GET | `/api/scan/status/{extension_id}` | Scan status | `realScanService.checkScanStatus()` |
| GET | `/api/scan/results/{extension_id}` | **Canonical scan result** | `databaseService.getScanResult()`, `realScanService.getRealScanResults()`, `ScanContext`, `ScanResultsPageV2` |
| GET | `/api/scan/icon/{extension_id}` | Extension icon | ScannerPage, ScanHistoryPage, ScanResultsPageV2, ScanProgressPage |
| GET | `/api/scan/enforcement_bundle/{extension_id}` | Governance bundle | realScanService |
| GET | `/api/scan/report/{extension_id}` | PDF report (open in new tab) | ReportDetailPage, ReportsPage |
| GET | `/api/scan/files/{extension_id}` | List extracted files | realScanService |
| GET | `/api/scan/file/{extension_id}/{file_path:path}` | Single file content | realScanService |
| DELETE | `/api/scan/{extension_id}` | Delete scan result | — |
| POST | `/api/clear` | Clear in-memory scans | — |
| GET | `/api/statistics` | Aggregated stats | databaseService.getStatistics() |
| POST | `/api/telemetry/pageview` | Page view | telemetryService |
| GET | `/api/telemetry/summary` | Telemetry summary | — |
| GET | `/api/history` | **User-scoped** scan history (auth required with Supabase) | databaseService.getScanHistory() |
| GET | `/api/recent` | **Global recent** scans (Postgres/SQLite); used by /scan and /scan/history | databaseService.getRecentScans(), ScannerPage, ScanHistoryPage |
| GET | `/api/user/karma` | User karma (Supabase) | — |
| GET | `/api/diagnostic/scans` | Debug scans in memory/DB | — |

## Data flow summary

- **Scan flow**: `/scan` → POST `/api/scan/trigger` or upload → GET `/api/scan/status/:id` (poll) → on completion, GET `/api/scan/results/:id` → stored in DB via `db.save_scan_result()` in `run_analysis_workflow`.
- **Dashboard /scan**: Table data from GET `/api/recent` (same DB as prod: Postgres/Supabase or SQLite).
- **/scan/history**: When testing without sign-in uses GET `/api/recent`; when signed in uses GET `/api/history` (user-scoped).
- **Results page /scan/results/:id**: Data from GET `/api/scan/results/:id` (memory → DB → file fallback).

## Removed / non-existent endpoints (do not use)

- `GET /api/extension/:id` — **not implemented**. Use GET `/api/scan/results/:id` instead.
- `GET /api/extension/:id/version/:hash` — **not implemented**. Versioned reports not yet supported; use `/api/scan/results/:id` for latest.

## Reusable usage

- **Get scan result by extension ID**: `GET /api/scan/results/{extension_id}` only. Used by Scanner, History, Results, Extension pages.
- **List recent scans**: `GET /api/recent?limit=&search=` for dashboard/history (no auth). `GET /api/history?limit=` for user history (auth when Supabase).
- **Start scan**: `POST /api/scan/trigger` (body: `{ "url": "https://chromewebstore..." }`) or `POST /api/scan/upload` (multipart file).

## Scan schema: store and retrieve

- **Stored by**: `run_analysis_workflow()` in `main.py` calls `db.save_scan_result(scan_results[extension_id])` after a successful scan. Same payload is written to Postgres (Supabase) or SQLite and optionally to a JSON file backup.
- **Supabase row**: `extension_id`, `extension_name`, `url`, `scanned_at`, `status`, `security_score`, `risk_level`, `total_findings`, `total_files`, `high_risk_count`, `medium_risk_count`, `low_risk_count`, `metadata`, `manifest`, `permissions_analysis`, `sast_results`, `webstore_analysis`, `summary` (JSONB: includes `scoring_v2`, `report_view_model`, `governance_bundle`, `virustotal_analysis`), `extracted_path`, `extracted_files`, `icon_path`, `error`, `created_at`, `updated_at`.
- **Retrieved by**: `GET /api/scan/results/:id` uses `db.get_scan_result(extension_id)` then maps DB columns to the response shape expected by the frontend (`overall_security_score`, `overall_risk`, `risk_distribution`, `report_view_model`, `scoring_v2`, `governance_bundle`). `/scan` and `/scan/history` tables use `GET /api/recent`, which uses `db.get_recent_scans()` (same table, same schema).
- **Recently scanned time**: API maps `scanned_at` (Postgres) or `timestamp` (SQLite) → `timestamp` in response. Fallback: `scanned_at` > `updated_at` > `created_at`. Frontend uses `timestamp ?? scanned_at ?? created_at ?? updated_at` for display.
- **Full schema**: See `docs/SCHEMA_REFERENCE.md`.

## Karma (user_profiles)

- **`karma_points`**: For recommending extensions and thumbs up/down (future feature). Schema ready; trigger `user_scan_history_increment_karma` increments karma on scan history insert.
- **API**: `GET /api/user/karma` (auth required) returns `karma_points`, `total_scans`.
