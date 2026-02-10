# Codebase Cleanup Summary

**Date:** 2026-01-XX  
**Purpose:** Document dead code removal and cleanup activities

---

## Removed Dead Code

### 1. `determine_overall_risk()` Function (Python)
- **Location:** `src/extension_shield/api/main.py:1460-1468`
- **Status:** ✅ REMOVED
- **Reason:** This function was never called. The new ScoringEngine v2 (in `scoring/engine.py`) provides `risk_level` via `scoring_result.risk_level.value`, making this legacy function obsolete.
- **Impact:** No breaking changes - function was unused.

### 2. `calculate_security_score()` Function (Python)
- **Location:** `src/extension_shield/api/main.py:1097-1371`
- **Status:** ⚠️ KEPT (but deprecated)
- **Reason:** While only called by the removed `determine_overall_risk()`, this function is a large legacy scoring implementation (275 lines). It's kept for reference and potential migration needs, but marked as deprecated.
- **Note:** The new ScoringEngine v2 (`scoring/engine.py`) is the recommended approach for all new code.

---

## Updated Exports

### `frontend/src/utils/index.ts`
- **Added:** Exports for new three-layer signal functions:
  - `calculateSecuritySignal`
  - `calculatePrivacySignal`
  - `calculateGovernanceSignal`
- **Kept:** Legacy signal functions for backward compatibility:
  - `calculateCodeSignal`
  - `calculatePermsSignal`
  - `calculateIntelSignal`

---

## Code Kept for Backward Compatibility

### Legacy Signal Functions (JavaScript)
- **Location:** `frontend/src/utils/signalMapper.js`
- **Functions:** `calculateCodeSignal()`, `calculatePermsSignal()`, `calculateIntelSignal()`
- **Reason:** These are used as fallbacks when `scoring_v2` data is not available in older scans. They ensure backward compatibility with scans that don't have the new three-layer scoring system.

### `formatRealResults()` Function (JavaScript)
- **Location:** `frontend/src/services/realScanService.js:261-372`
- **Status:** ✅ KEPT (actively used)
- **Usage:** Called in:
  - `frontend/src/pages/reports/ReportDetailPage.jsx:627`
  - `frontend/src/pages/AnalysisPage.jsx:60`
  - `frontend/src/pages/DashboardPage.jsx:243`
- **Note:** While there's a comment saying "DO NOT call formatRealResults()" in `getRealScanResults()`, the function is still used in other pages for legacy data transformation.

### `calculate_security_score()` Function (Python)
- **Location:** `src/extension_shield/api/main.py:1097-1371`
- **Status:** ⚠️ DEPRECATED (kept for reference)
- **Reason:** Large legacy implementation (275 lines). Replaced by ScoringEngine v2, but kept for reference and potential migration needs.

---

## API Endpoints Status

All API endpoints are actively used:

- ✅ `/api/scan/trigger` - Used by frontend
- ✅ `/api/scan/status/{extension_id}` - Used by frontend
- ✅ `/api/scan/results/{extension_id}` - Used by frontend
- ✅ `/api/scan/upload` - Used by frontend
- ✅ `/api/scan/enforcement_bundle/{extension_id}` - Used by frontend
- ✅ `/api/scan/report/{extension_id}` - Used by frontend (PDF generation)
- ✅ `/api/scan/files/{extension_id}` - Used by frontend
- ✅ `/api/scan/file/{extension_id}/{file_path}` - Used by frontend
- ✅ `/api/scan/icon/{extension_id}` - Used by frontend
- ✅ `/api/limits/deep-scan` - Used by frontend
- ✅ `/api/recent` - Used by frontend
- ✅ `/api/history` - Used by frontend
- ✅ `/api/statistics` - Used by frontend
- ✅ `/api/telemetry/pageview` - Used by frontend
- ✅ `/api/clear` - Used by frontend (admin function)
- ✅ `/api/health/db` - Health check endpoint

**No unused API endpoints found.**

---

## Summary

### Removed
- 1 unused function: `determine_overall_risk()` (9 lines)

### Kept for Backward Compatibility
- Legacy signal calculation functions (JavaScript)
- `formatRealResults()` function (JavaScript) - actively used
- `calculate_security_score()` function (Python) - deprecated but kept for reference

### Updated
- Exports in `frontend/src/utils/index.ts` to include new signal functions

### Code Reduction
- **Lines removed:** ~9 lines (dead function)
- **Codebase impact:** Minimal - removed only truly unused code
- **Breaking changes:** None

---

## Recommendations

1. **Future Cleanup:** Consider removing `calculate_security_score()` after confirming all legacy scans have been migrated to ScoringEngine v2.
2. **Documentation:** The legacy `calculate_security_score()` function is well-documented in `docs/SCORING_MODEL_COMPARISON.md`.
3. **Testing:** All tests pass with the removed dead code.

---

## Notes

- The codebase is relatively clean with minimal dead code.
- Most "legacy" code is kept intentionally for backward compatibility.
- The new three-layer scoring system (Security/Privacy/Governance) is fully integrated and working.

