# ExtensionShield Frontend – Overview & API Reference

This document describes the frontend structure, all pages/routes, components, services, and **every API call** so you can compare against the backend and spot unused or missing code.

---

## 1. Site map (all routes)

| Path | Page / behavior | SEO / notes |
|------|------------------|-------------|
| `/` | HomePage | Canonical, sitemap |
| `/scan` | ScannerPage | Start scan |
| `/scan/history` | ScanHistoryPage | Scan history |
| `/scan/progress/:scanId` | ScanProgressPage | Progress (no SEO) |
| `/scan/results/:scanId` | ScanResultsPageV2 | Results (no SEO) |
| `/extension/:extensionId` | ExtensionPage | Extension overview |
| `/extension/:extensionId/version/:buildHash` | ExtensionVersionPage | Version report |
| `/research` | ResearchPage | Research hub |
| `/research/case-studies` | CaseStudiesPage | Case studies |
| `/research/case-studies/honey` | HoneyCaseStudyPage | Honey case study |
| `/research/methodology` | MethodologyPage | How we score |
| `/research/benchmarks` | BenchmarksPage | Benchmarks |
| `/enterprise` | EnterprisePage | Enterprise / pilot |
| `/about` | AboutUsPage | About |
| `/open-source` | OpenSourcePage | Open source |
| `/gsoc/ideas` | GSoCIdeasPage | GSoC ideas |
| `/contribute` | ContributePage | Contribute |
| `/gsoc/community` | CommunityPage | Community |
| `/gsoc/blog` | BlogPage | Blog |
| `/reports` | ReportsPage | Reports (enterprise) |
| `/reports/:reportId` | ReportDetailPage | Report detail |
| `/auth/callback` | AuthCallbackPage | OAuth callback |
| `/auth/diagnostics` | AuthDiagnosticsPage | Auth debug |
| `/settings` | SettingsPage | Settings |
| `/privacy-policy` | PrivacyPolicyPage | Privacy |
| `/glossary` | GlossaryPage | Glossary (lazy) |

**Legacy redirects (no separate components):**

- `/scanner` → `/scan`
- `/scanner/progress/:scanId` → `/scan/progress/:scanId`
- `/scanner/results/:scanId` → `/scan/results/:scanId`
- `/history` → `/scan/history`
- `/dashboard` → `/scan`
- `/scan-history` → `/scan/history`
- `/sample-report` → `/research/case-studies/honey`
- `/analysis` → `/scan`
- `/open-source/gsoc` → `/gsoc/ideas`

**Catch-all:** `*` → redirect to `/`.

---

## 2. Frontend structure (high level)

```
frontend/
├── index.html
├── vite.config.js
├── package.json
├── .env.example          # VITE_SUPABASE_*, VITE_API_URL, VITE_DEBUG_AUTH
├── public/               # Static assets, data/benchmarks.json, data/trends.json
├── scripts/              # Sitemap, SEO checks
└── src/
    ├── main.jsx
    ├── App.jsx           # Router, AuthProvider, ScanProvider, ThemeProvider, layout
    ├── routes/routes.jsx # All route definitions
    ├── nav/navigation.js  # Top nav, mega menu, user menu, footer
    ├── context/          # AuthContext, ScanContext, ThemeContext
    ├── services/         # API and auth (see below)
    ├── pages/            # One dir per area (scanner/, research/, gsoc/, etc.)
    ├── components/       # Shared UI and report components
    ├── hooks/            # useSafeAsync
    ├── lib/              # utils.js
    └── utils/            # constants, extensionId, signalMapper, normalizeScanResult, etc.
```

---

## 3. All API calls (by source)

Base URL for API: `import.meta.env.VITE_API_URL || ""` (same-origin when empty).  
Auth: `realScanService.getRequestHeaders()` / `getAuthHeaders()` / `getUserHeaders()` where noted.

### 3.1 realScanService.js

| Method | HTTP | Endpoint | Used by |
|--------|------|----------|---------|
| getDeepScanLimitStatus | GET | `/api/limits/deep-scan` | ScanContext, ScannerPage |
| hasCachedResults | GET | `/api/scan/results/{extensionId}` | ScanContext, ScannerPage |
| triggerScan | POST | `/api/scan/trigger` (body: `{ url }`) | ScanContext |
| uploadAndScan | POST | `/api/scan/upload` (FormData file) | ScanContext |
| getRealScanResults | GET | `/api/scan/results/{extensionId}` | ScanContext, ScanProgressPage, ReportDetailPage, ScanResultsPageV2 (via context) |
| checkScanStatus | GET | `/api/scan/status/{extensionId}` | ScanContext, ScanProgressPage |
| getFileContent | GET | `/api/scan/file/{extensionId}/{file_path:path}` | ScanResultsPageV2, ReportDetailPage |
| getFileList | GET | `/api/scan/files/{extensionId}` | (service only; callers may use elsewhere) |
| getComplianceReport | GET | `/api/scan/results/{scanId}` | (same as getRealScanResults by ID) |
| downloadEnforcementBundle | GET | `/api/scan/enforcement_bundle/{scanId}` | (service only) |
| getEnforcementBundle | GET | `/api/scan/enforcement_bundle/{scanId}` | (service only) |
| getCitation | GET | `/api/citations/{citationId}` | **Not used anywhere** (dead code) |

### 3.2 databaseService.js

Base: `VITE_API_URL + "/api"`.

| Method | HTTP | Endpoint | Used by |
|--------|------|----------|---------|
| getStatistics | GET | `/api/statistics` | ScanContext (dashboard metrics) |
| getScanHistory | GET | `/api/history?limit=N` (auth header optional) | ScanContext, ScanHistoryPage, ReportsPage |
| getRecentScans | GET | `/api/recent?limit=N` | ScannerPage, enrichScans |
| getScanResult | GET | `/api/scan/results/{extensionId}` | ReportDetailPage, scanEnrichment, ScanHistoryPage (metrics) |
| deleteScanResult | DELETE | `/api/scan/{extensionId}` | (exposed; callers TBD) |
| clearAllResults | POST | `/api/clear` | (exposed; callers TBD) |

### 3.3 ScanContext.jsx (direct fetch)

Same base URL as above; uses `realScanService.getRequestHeaders()`.

| Purpose | HTTP | Endpoint |
|--------|------|----------|
| loadScanFromHistory | GET | `/api/scan/results/{extId}` |
| loadResultsById | GET | `/api/scan/results/{extId}` |

### 3.4 Extension pages (direct fetch)

| File | HTTP | Endpoint | Note |
|------|------|----------|------|
| ExtensionPage.jsx | GET | `/api/extension/{extensionId}` | **No backend route** (404 in current API) |
| ExtensionVersionPage.jsx | GET | `/api/extension/{extensionId}/version/{buildHash}` | **No backend route** (404) |

### 3.5 EnterprisePage.jsx

| Purpose | HTTP | Endpoint |
|--------|------|----------|
| Pilot request form | POST | `VITE_API_URL + "/api/enterprise/pilot-request"` (JSON body) |

### 3.6 Reports pages

| File | Usage |
|------|--------|
| ReportsPage.jsx | Uses `databaseService.getScanHistory(50)` only (no extra HTTP) |
| ReportDetailPage.jsx | Uses `databaseService.getScanResult`, `realScanService.getRealScanResults`, `realScanService.formatRealResults`, `realScanService.getFileContent`; opens PDF in new tab: `GET /api/scan/report/{reportId}` |
| ReportsPage.jsx (export PDF) | Opens `GET /api/scan/report/{extensionId}` in new tab |

### 3.7 Scan UI (icon URL)

These build the icon URL (no fetch in code; used in `<img src>`):

- ScannerPage: `${API_BASE_URL}/api/scan/icon/${extensionId}`
- ScanProgressPage: `${API_BASE_URL}/api/scan/icon/${scanId}`
- ScanHistoryPage: `${API_BASE_URL}/api/scan/icon/${extensionId}`
- ScanResultsPageV2: `baseURL + "/api/scan/icon/" + extensionIdForIcon` (or same-origin)

### 3.8 telemetryService.js

| Function | HTTP | Endpoint |
|----------|------|----------|
| trackPageView(pathname) | POST | `/api/telemetry/pageview` (body: `{ path }`) |

Called from `App.jsx` on route change.

### 3.9 gptOssService.js (unused)

This service is **never imported** by any page or component. It defines:

- GET `/health`
- GET `/api/providers/status`
- POST `/api/analyze/file` (FormData)
- POST `/api/upload/file` (FormData)
- GET `/api/config`

**Recommendation:** Remove or gate behind a feature flag if you plan to use it later.

---

## 4. Backend routes (for comparison)

From `src/extension_shield/api/main.py`:

| Method | Path |
|--------|------|
| GET | `/` |
| GET | `/robots.txt` |
| GET | `/api/limits/deep-scan` |
| POST | `/api/enterprise/pilot-request` |
| POST | `/api/scan/trigger` |
| POST | `/api/scan/upload` |
| GET | `/api/scan/status/{extension_id}` |
| GET | `/api/scan/results/{extension_id}` |
| GET | `/api/scan/enforcement_bundle/{extension_id}` |
| GET | `/api/scan/report/{extension_id}` |
| GET | `/api/scan/files/{extension_id}` |
| GET | `/api/scan/file/{extension_id}/{file_path:path}` |
| GET | `/api/statistics` |
| POST | `/api/telemetry/pageview` |
| GET | `/api/telemetry/summary` |
| GET | `/api/history` |
| GET | `/api/user/karma` |
| GET | `/api/recent` |
| GET | `/api/diagnostic/scans` |
| DELETE | `/api/scan/{extension_id}` |
| POST | `/api/clear` |
| GET | `/health` |
| GET | `/api/health/db` |
| GET | `/api/scan/icon/{extension_id}` |
| GET | `/{full_path:path}` (SPA catch-all) |

---

## 5. Frontend vs backend – gaps and extras

### 5.1 Frontend calls with no backend route (will 404)

- `GET /api/extension/{extensionId}` — ExtensionPage
- `GET /api/extension/{extensionId}/version/{buildHash}` — ExtensionVersionPage
- `GET /api/citations/{citationId}` — realScanService.getCitation (and **never called** in the app)

So:

- **ExtensionPage** and **ExtensionVersionPage** will get 404 unless you add these endpoints or proxy to scan results (e.g. alias extension to latest scan result).
- **getCitation** is dead code; backend has no `/api/citations/...`. Safe to remove or implement later.

### 5.2 Backend routes not used by frontend

- `GET /api/telemetry/summary`
- `GET /api/user/karma`
- `GET /api/health/db`
- `GET /api/diagnostic/scans`

No problem; they can be for internal or future use.

### 5.3 All other frontend API usage

All other calls in this doc (scan trigger/upload/status/results, file/content, enforcement bundle, report PDF, statistics, history, recent, clear, delete scan, limits, enterprise pilot, telemetry pageview, scan icon) have a matching backend route.

---

## 6. Unused or legacy code

### 6.1 Unused services / modules

- **gptOssService.js** – Not imported anywhere. Either remove or keep for future GPT-OSS UI.
- **cacheService.js** – Not imported anywhere. History/storage now use backend (databaseService). Safe to remove unless you want a local cache again.
- **CacheConfirmationModal.jsx** – Not imported by any file. Modal exists but is never used. Remove or wire to scanner flow (e.g. “use cached result?”).
- **realScanService.getCitation** – Never called. Backend has no `/api/citations`. Remove or implement when you add citations API.

### 6.2 Legacy / redirect-only routes

All legacy paths are already redirected in `routes.jsx` (e.g. `/scanner` → `/scan`, `/history` → `/scan/history`). No old page components are mounted for them.

### 6.3 Single results page

Only **ScanResultsPageV2** is used for `/scan/results/:scanId`. There is no separate “ScanResultsPage” (non-V2) in routes or imports; the codebase is consistent.

---

## 7. Components (quick reference)

| Component | Purpose |
|-----------|--------|
| SEOHead | Helmet-based title/description/canonical |
| ShieldLogo | Logo + optional link |
| Footer | Footer from nav config |
| SignInModal | Sign-in (Google/GitHub/email) |
| EnhancedUrlInput | URL input for scanner |
| ScanProgress | Progress UI for scan |
| ScanHUD | Scan heads-up display |
| CacheConfirmationModal | **Unused** – “use cached result?” modal |
| RocketGame | Easter-egg game |
| StatusMessage | Status text |
| FileViewerModal | File content viewer |
| report/* | ReportScoreCard, RiskDial, KeyFindings, EvidenceDrawer, PermissionsPanel, etc. |
| dashboard/* | FactorBreakdown, RiskGauge, ScoreCard, StatsPanel |
| compliance/* | CitationBadge, ComplianceMatrixCard, DisclosureMismatchAlert, EvidenceModal |
| benchmarks/* | CoverageChart, DivergenceChart, PerformanceChart, TrendChart, SourcesBox |
| ui/* | badge, button, card, dialog, input, tabs, textarea, tooltip, StatsIcon |

---

## 8. Environment variables (frontend)

From `.env.example` and usage in code:

- **VITE_SUPABASE_URL** – Supabase project URL (auth)
- **VITE_SUPABASE_ANON_KEY** – Supabase anon key (auth)
- **VITE_API_URL** – Backend base URL (e.g. `http://localhost:8007` in dev). Empty = same origin
- **VITE_DEBUG_AUTH** – Optional; enables auth diagnostics

---

## 9. Summary checklist

- **Routes:** All current and legacy routes are documented; legacy paths redirect correctly.
- **API list:** Every frontend API call is listed with method, path, and caller.
- **Backend alignment:** Only `/api/extension/...` and `/api/citations/...` are called from the frontend but missing on the backend; `getCitation` is unused.
- **Unused code:** gptOssService, cacheService, CacheConfirmationModal, and getCitation are identified; you can remove or implement as needed.
- **Codebase setup:** Single results page (V2), one scan flow, auth and scan context wired; no references to a non-V2 ScanResultsPage.

Use this doc to compare backend routes when adding or changing APIs and to clean up unused frontend code.
