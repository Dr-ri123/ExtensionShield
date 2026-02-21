# ExtensionShield Codebase Audit (Sitemap vs Frontend/Src)

**Date:** 2026-02-21  
**Goal:** Streamline frontend and `src` engine for open source; remove duplicates and unused code.

---

## 1. Site map (from `frontend/src/routes/routes.jsx`)

The sitemap is generated from routes with `seo` and static paths (see `frontend/scripts/generate-sitemap.js`).  
Live `https://extensionshield.com/sitemap.xml` returned 500 during audit; route config is the source of truth.

### SEO / public routes (in sitemap)

| Path | Page component | Notes |
|------|-----------------|--------|
| `/` | HomePage | ✓ |
| `/scan` | ScannerPage | ✓ |
| `/scan/history` | ScanHistoryPage | ✓ |
| `/research` | ResearchPage | ✓ |
| `/research/case-studies` | CaseStudiesPage | ✓ |
| `/research/case-studies/honey` | HoneyCaseStudyPage | ✓ |
| `/research/case-studies/pdf-converters` | PdfConvertersCaseStudyPage | ✓ |
| `/research/case-studies/fake-ad-blockers` | FakeAdBlockersCaseStudyPage | ✓ |
| `/research/methodology` | MethodologyPage | ✓ |
| `/research/benchmarks` | BenchmarksPage | ✓ |
| `/is-this-chrome-extension-safe` | IsThisChromeExtensionSafePage | ✓ |
| `/chrome-extension-permissions` | ChromeExtensionPermissionsPage | ✓ |
| `/chrome-extension-security-scanner` | ChromeExtensionSecurityScannerPage | ✓ |
| `/browser-extension-risk-assessment` | BrowserExtensionRiskAssessmentPage | ✓ |
| `/crxcavator-alternative` | CrxcavatorAlternativePage | ✓ |
| `/compare` | CompareIndexPage | ✓ |
| `/compare/crxcavator` | CompareCrxcavatorPage | ✓ |
| `/compare/crxplorer` | CompareCrxplorerPage | ✓ |
| `/compare/extension-auditor` | CompareExtensionAuditorPage | ✓ |
| `/blog` | BlogIndexPage | ✓ (uses `blogPosts.js`) |
| `/blog/how-to-audit-chrome-extension-before-installing` | BlogPostPage | ✓ |
| `/blog/enterprise-browser-extension-risk-management` | BlogPostPage | ✓ |
| `/blog/how-to-detect-malicious-chrome-extensions` | BlogPostPage | ✓ |
| `/enterprise` | EnterprisePage | ✓ |
| `/about` | AboutUsPage | ✓ |
| `/open-source` | OpenSourcePage | ✓ |
| `/community` | CommunityLandingPage | ✓ |
| `/gsoc/ideas` | GSoCIdeasPage | ✓ |
| `/contribute` | ContributePage | ✓ |
| `/gsoc/community` | CommunityPage | ✓ |
| `/gsoc/blog` | BlogPage (gsoc) | **Duplicate concept** – hardcoded “Welcome” post + CTA to `/blog`; consider redirect to `/blog` |
| `/privacy-policy` | PrivacyPolicyPage | ✓ |
| `/glossary` | GlossaryPage | ✓ |

### Dynamic / non-SEO routes (not in sitemap)

- `/scan/progress/:scanId` → ScanProgressPage  
- `/scan/results/:scanId` → ScanResultsPageV2  
- `/scan/results/dashboard` → ScanResultsDashboardPage (**orphan** – no nav link; static mock; removed in cleanup)  
- `/reports/:reportId` → ReportDetailPage  
- `/auth/callback`, `/auth/diagnostics`  
- `/settings`, `/debug/theme`  
- Redirects: `/extension/:id`, `/scanner`, `/history`, `/dashboard`, etc.

---

## 2. Removed / cleaned (this audit)

### Frontend – removed as unused

| Item | Reason |
|------|--------|
| `components/CopyButton.jsx` | Never imported anywhere |
| `components/EnhancedMetricCard.jsx` + `.scss` | Never imported anywhere |
| `utils/plainEnglishTranslator.js` | Never imported; `translateReason` unused |
| `components/compliance/` (entire folder) | ComplianceMatrixCard, CitationBadge, DisclosureMismatchAlert, EvidenceModal – no page or report imports them |
| `pages/scanner/ScanResultsDashboardPage.jsx` + `.scss` | Orphan route; static mock; no links from app |
| Route `/scan/results/dashboard` and lazy import | Tied to ScanResultsDashboardPage removal |
| `pages/scanner/index.js` export of ScanResultsDashboardPage | Tied to page removal |
| `databaseService.getExtensionStats` | Never called |
| `databaseService.getRecentUrls` | Never called |
| `databaseService.getRiskDistribution` | Never called |

### Frontend – optional follow-up

- **GSoC Blog (`/gsoc/blog`):** Currently a thin page with one hardcoded post and link to `/blog`. You could redirect `/gsoc/blog` → `/blog` and remove `pages/gsoc/BlogPage.jsx` to avoid two “blog” entry points.

---

## 3. Backend (`src/extension_shield/api/main.py`) – reference only

No backend code was removed. Endpoints the frontend uses (for alignment):

- `GET /api/limits/deep-scan`  
- `POST /api/scan/trigger`, `POST /api/scan/upload`  
- `GET /api/scan/status/:id`, `GET /api/scan/results/:id`  
- `GET /api/scan/files/:id`, `GET /api/scan/file/:id/:path`  
- `GET /api/scan/icon/:id`, `GET /api/scan/report/:id`  
- `GET /api/scan/enforcement_bundle/:id`  
- `POST /api/feedback`, `POST /api/enterprise/pilot-request`  
- `POST /api/telemetry/pageview`, `POST /api/telemetry/event`  
- `GET /api/history`, `GET /api/recent`  
- `GET /api/statistics`  
- `DELETE /api/scan/:id`, `POST /api/clear`  

Endpoints not used by the frontend (may be for scripts, health, or future use):

- `GET /api/diagnostic/scans`  
- `GET /api/user/karma`  
- `GET /api/telemetry/summary`  
- `GET /api/health/sentry-test`, `GET /api/health/db`  

Leave as-is unless you confirm they are unused everywhere.

---

## 4. Duplicate / overlap check

- **Blog:** `BlogIndexPage` (SEO blog from `blogPosts.js`) vs `BlogPage` (GSoC, one hardcoded post). Different content; GSoC page can be consolidated with redirect to `/blog` if desired.  
- **Scan results:** Only one active results page: `ScanResultsPageV2`. No duplicate components.  
- **Report components:** Used by `ScanResultsPageV2` and `ReportDetailPage`; no duplicate report pages.

---

## 5. Summary

- **Removed:** Unused components (CopyButton, EnhancedMetricCard, full `compliance/` folder), unused util (`plainEnglishTranslator`), orphan `ScanResultsDashboardPage` and its route/export, and three unused `databaseService` methods.  
- **Site map:** All SEO routes in `routes.jsx` map to a single page component; no duplicate routes.  
- **Backend:** Left unchanged; optional cleanup of unused API routes can be done later with confirmation.
