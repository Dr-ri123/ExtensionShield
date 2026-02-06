# Security Audit Report
**ExtensionShield Repository**  
**Date:** 2025-01-30  
**Auditor:** Automated Security Audit

---

## Executive Summary

This audit evaluates the security posture of the ExtensionShield codebase across 11 key areas. The application is a FastAPI backend with React frontend for Chrome extension security analysis.

### Overall Status

| Category | Status | Count |
|----------|--------|-------|
| ✅ **Secure** | Implemented correctly | 4 |
| ⚠️ **Partial** | Needs improvement | 5 |
| ❌ **Missing** | Critical gaps | 2 |

**Key Findings:**
- ✅ Secrets management: Good (file untracked, .gitignore configured)
- ✅ File upload security: Good (sanitization, magic bytes validation)
- ⚠️ Security headers: Present but CSP needs tightening
- ⚠️ CORS: Hardcoded localhost origins (needs env-based config)
- ❌ Rate limiting: Only per-user in-memory limits (no global rate limiting)
- ❌ SSRF protection: Missing for outbound HTTP requests
- ⚠️ AuthZ: Partial (some endpoints lack ownership checks)
- ⚠️ Zip extraction: Missing zip-slip protection and size limits
- ⚠️ Error handling: May leak internal paths in production
- ⚠️ CI/CD: Missing security scanning jobs

---

## Detailed Findings

### 1. Secrets & Git Hygiene ✅

**Status:** Secure

| Item | Status | Evidence | Recommendation |
|------|--------|----------|---------------|
| `images/env` tracking | ✅ Not tracked | `git ls-files` confirms | None |
| Secrets in history | ⚠️ Exists in history | Commit 2523c56 | Optional: Run `git-filter-repo` (see docs/SECURITY.md) |
| .gitignore coverage | ✅ Complete | Includes `.env`, `images/env`, `*.db` | None |
| Secrets in tracked files | ✅ None found | No API keys in tracked files | None |

**Evidence:**
- `.gitignore` line 203: `images/env` is ignored
- `git ls-files | grep '^images/env$'` returns empty
- No `sk-` patterns found in tracked files (only CSS class names like `risk-`)

**Recommendation:** Acceptable for private repo. If making public, run git history cleanup.

---

### 2. Security Headers ⚠️

**Status:** Partial (needs CSP tightening)

**Location:** `src/extension_shield/api/main.py:86-100`

**Current Implementation:**
```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if not response.headers.get("Content-Security-Policy"):
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
```

**Findings:**

| Header | Status | Issue |
|--------|--------|-------|
| X-Content-Type-Options | ✅ Good | `nosniff` set |
| X-Frame-Options | ✅ Good | `DENY` set |
| X-XSS-Protection | ✅ Good | Set (legacy but harmless) |
| HSTS | ✅ Good | Conditional on HTTPS |
| CSP | ⚠️ Weak | `unsafe-inline` and `unsafe-eval` allowed |

**Recommendation:**
- **Quick Win:** Remove `unsafe-eval` from CSP (React doesn't need it in production)
- **Before Public:** Tighten CSP to remove `unsafe-inline` for scripts (use nonces/hashes)

---

### 3. CORS Configuration ⚠️

**Status:** Partial (hardcoded origins)

**Location:** `src/extension_shield/api/main.py:102-115`

**Current Implementation:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server (default)
        "http://localhost:5174",  # Vite fallback port
        "http://localhost:5175",  # Vite fallback port
        "http://localhost:5176",  # Vite fallback port
        "http://localhost:5177",  # Vite fallback port
        "http://localhost:3000",  # Alternative dev port
        "http://localhost:8007",  # Same-origin in container
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Findings:**

| Issue | Risk | Evidence |
|-------|------|----------|
| Hardcoded origins | Medium | All localhost (dev-only) |
| `allow_methods=["*"]` | Low | Too permissive |
| `allow_headers=["*"]` | Low | Too permissive |
| No production origins | Medium | Production frontend not configured |

**Recommendation:**
- **Quick Win:** Make origins environment-based:
  ```python
  allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
  ```
- **Before Public:** Restrict methods to `["GET", "POST", "OPTIONS"]` and headers to specific list

---

### 4. File Upload Security ✅

**Status:** Secure (with minor improvements possible)

**Location:** `src/extension_shield/api/main.py:1152-1248`

**Current Protections:**
- ✅ Filename sanitization (line 1174): `os.path.basename()` + character filtering
- ✅ File extension validation (line 1181): `.crx` or `.zip` only
- ✅ File size limit (line 1188): 100MB max
- ✅ Magic bytes validation (line 1200-1201): CRX (`Cr24`) or ZIP (`PK`) detection
- ✅ Path traversal prevention (line 1505): Absolute path check in file serving

**Findings:**

| Protection | Status | Evidence |
|------------|--------|----------|
| Filename sanitization | ✅ Good | Line 1174-1178 |
| Extension validation | ✅ Good | Line 1181-1185 |
| Size limit | ✅ Good | 100MB max |
| Magic bytes | ✅ Good | CRX/ZIP detection |
| Path traversal | ✅ Good | Absolute path check |

**Minor Improvement:**
- Consider adding MIME type validation in addition to magic bytes (currently only magic bytes)

**Recommendation:** No critical issues. Current implementation is secure.

---

### 5. Archive Extraction ⚠️

**Status:** Partial (missing zip-slip protection)

**Location:** `src/extension_shield/utils/extension.py:64-111`

**Current Implementation:**
```python
with zipfile.ZipFile(file_path, "r") as zip_ref:
    zip_ref.extractall(extract_dir)
```

**Findings:**

| Issue | Risk | Evidence |
|-------|------|----------|
| No zip-slip protection | **HIGH** | Line 94-95, 101-102: Direct `extractall()` |
| No file count limit | Medium | No limit on extracted files |
| No total size limit | Medium | No limit on extracted size |
| No depth limit | Low | No symlink/directory depth check |

**Vulnerability:** Zip-slip attack possible if malicious ZIP contains paths like `../../../etc/passwd`.

**Fix Plan (Critical - <15 lines):**
```python
# In extract_extension_crx(), replace extractall() with:
def safe_extract(zip_ref, extract_dir):
    """Extract ZIP with zip-slip protection."""
    for member in zip_ref.infolist():
        # Normalize path and check for zip-slip
        target_path = os.path.join(extract_dir, member.filename)
        abs_target = os.path.abspath(target_path)
        abs_extract = os.path.abspath(extract_dir)
        if not abs_target.startswith(abs_extract):
            raise ValueError(f"Zip-slip attempt: {member.filename}")
        zip_ref.extract(member, extract_dir)

# Then use:
safe_extract(zip_ref, extract_dir)
```

**Recommendation:** **CRITICAL** - Implement zip-slip protection before production.

---

### 6. SSRF Protection ❌

**Status:** Missing

**Locations:**
- `src/extension_shield/core/extension_downloader.py:62` - Downloads from Chrome Web Store
- `src/extension_shield/core/extension_metadata.py:35` - Fetches extension pages
- `src/extension_shield/governance/store_listing_extractor.py:444` - Fetches store listings
- `src/extension_shield/core/chromestats_downloader.py:57` - Fetches ChromeStats data

**Findings:**

| Issue | Risk | Evidence |
|-------|------|----------|
| No private IP blocking | **HIGH** | All `requests.get()` calls allow any URL |
| No domain allowlist | Medium | URLs come from user input (extension URLs) |
| Timeouts present | ✅ Good | Most have `timeout=30-120` |
| No max response size | Medium | Stream downloads but no size limit |

**Vulnerability:** User-provided extension URLs could be manipulated to:
- Access internal services (`http://127.0.0.1:8080/admin`)
- Access cloud metadata (`http://169.254.169.254/latest/meta-data/`)
- Port scan internal network

**Current URL Sources:**
- Extension URLs from user input (line 1073: `request.url`)
- Chrome Web Store URLs (hardcoded pattern, but user-controlled)

**Recommendation:**
- **Before Public:** Implement domain allowlist (only `chromewebstore.google.com`, `clients2.google.com`)
- **Before Public:** Block private IP ranges (127.0.0.1, 10.0.0.0/8, 192.168.0.0/16, 169.254.0.0/16)
- Add max response size limits for stream downloads

---

### 7. Authentication & Authorization ⚠️

**Status:** Partial (some endpoints lack ownership checks)

**Location:** `src/extension_shield/api/main.py:73-83` (auth middleware)

**Current Implementation:**
- ✅ JWT verification via JWKS (Supabase)
- ✅ User ID attached to request context
- ⚠️ Some endpoints don't check ownership

**Findings:**

| Endpoint | AuthZ Check | Risk | Evidence |
|----------|-------------|------|----------|
| `/api/scan/results/{extension_id}` | ❌ None | **HIGH** | Line 1277: Returns any scan result |
| `/api/scan/files/{extension_id}` | ❌ None | **HIGH** | Line 1458: Lists files for any extension |
| `/api/scan/file/{extension_id}/{file_path}` | ❌ None | **HIGH** | Line 1481: Serves files for any extension |
| `/api/history` | ✅ User-scoped | Good | Line 1584: Checks `user_id` |
| `/api/scan/status/{extension_id}` | ❌ None | Medium | Line 1251: Status is public (acceptable) |

**Vulnerability:** Any user can access scan results/files from other users' scans by guessing extension IDs.

**Fix Plan (Critical - <15 lines per endpoint):**
```python
# In get_scan_results(), add before returning:
user_id = getattr(getattr(http_request, "state", None), "user_id", None)
if user_id:
    # Check ownership via scan_user_ids or database
    scan_owner = scan_user_ids.get(extension_id)
    if scan_owner and scan_owner != user_id:
        raise HTTPException(403, "Access denied")
```

**Recommendation:** **CRITICAL** - Add ownership checks before public release.

---

### 8. Rate Limiting ❌

**Status:** Missing (only per-user in-memory limits)

**Location:** `src/extension_shield/api/main.py:116-118, 172-194`

**Current Implementation:**
- Per-user daily deep-scan limit (2 scans/day)
- In-memory storage (lost on restart)
- No global rate limiting

**Findings:**

| Issue | Risk | Evidence |
|-------|------|----------|
| No global rate limiting | **HIGH** | No middleware for API-wide limits |
| In-memory limits | Medium | Reset on server restart |
| No per-endpoint limits | Medium | All endpoints unlimited |
| No IP-based limits | Medium | Anonymous users unlimited |

**Vulnerability:** 
- DoS attacks possible (unlimited requests)
- Anonymous users can bypass per-user limits
- No protection against brute force

**Recommendation:**
- **Before Public:** Install `slowapi` or `fastapi-limiter`
- **Before Public:** Add global rate limiting (e.g., 100 req/min per IP)
- **Before Public:** Stricter limits on upload/scan endpoints (e.g., 10 req/hour)
- Move limits to database/Redis for persistence

---

### 9. Error Handling & Logging ⚠️

**Status:** Partial (may leak internal info)

**Location:** `src/extension_shield/api/main.py` (multiple exception handlers)

**Findings:**

| Issue | Risk | Evidence |
|-------|------|----------|
| Exception messages in responses | Medium | Line 1233: `str(e)` in error detail |
| Stack traces in production | Medium | FastAPI default behavior |
| No error sanitization | Medium | Raw exceptions returned |
| Logging may include secrets | Low | No evidence of secret logging |

**Example Issues:**
- Line 1233: `raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")` - May expose file paths
- Line 1519: `detail=f"Error reading file: {str(e)}"` - May expose internal paths

**Recommendation:**
- **Quick Win:** Add production error handler:
  ```python
  if settings.env == "prod":
      detail = "Internal server error"
  else:
      detail = str(e)
  ```
- **Before Public:** Sanitize all error messages in production mode

---

### 10. Dependency Scanning ⚠️

**Status:** Missing in CI

**Dependency Files Found:**
- `pyproject.toml` - Python dependencies
- `frontend/package.json` - Node dependencies
- `uv.lock` - Python lockfile (if using uv)

**Current State:**
- No automated dependency scanning in CI
- No security audit commands documented

**Recommendation:**
- **Quick Win:** Add to CI workflow:
  ```yaml
  - name: Python security audit
    run: pip install pip-audit && pip-audit
  - name: Node security audit
    run: cd frontend && npm audit --audit-level=moderate
  ```
- **Before Public:** Run `pip-audit` and `npm audit` regularly

**Manual Commands:**
```bash
# Python
pip install pip-audit
pip-audit

# Node
cd frontend
npm audit --audit-level=moderate
```

---

### 11. CI/CD Guardrails ⚠️

**Status:** Partial (missing security scanning)

**Location:** `.github/workflows/deploy.yml`

**Current CI Jobs:**
- ✅ Tests (pytest)
- ✅ Linting (pylint)
- ❌ No secret scanning
- ❌ No dependency scanning
- ❌ No security smoke tests

**Findings:**

| Job | Status | Evidence |
|-----|--------|----------|
| Tests | ✅ Present | Line 42-44 |
| Linting | ✅ Present | Line 39-40 |
| Secret scanning | ❌ Missing | No gitleaks or GitHub secret scanning |
| Dependency audit | ❌ Missing | No pip-audit or npm audit |
| Security smoke test | ❌ Missing | No security validation script |

**Recommendation:**
- **Quick Win:** Enable GitHub secret scanning (repository settings)
- **Before Public:** Add gitleaks action:
  ```yaml
  - name: Secret scanning
    uses: gitleaks/gitleaks-action@v2
  ```
- **Before Public:** Add dependency scanning (see section 10)

---

## Quick Wins (< 1 hour each)

1. **Make CORS origins environment-based** (15 min)
   - File: `src/extension_shield/api/main.py:102-115`
   - Change: `allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")`

2. **Tighten CSP** (10 min)
   - File: `src/extension_shield/api/main.py:99`
   - Change: Remove `'unsafe-eval'` from CSP

3. **Add production error sanitization** (20 min)
   - File: `src/extension_shield/api/main.py` (multiple locations)
   - Change: Check `settings.env == "prod"` before including error details

4. **Enable GitHub secret scanning** (5 min)
   - Repository Settings → Security → Secret scanning → Enable

5. **Add dependency audit to CI** (15 min)
   - File: `.github/workflows/deploy.yml`
   - Add: `pip-audit` and `npm audit` steps

---

## Before Sharing Publicly (Must-Do)

### Critical (Security Vulnerabilities)

1. **Fix zip-slip vulnerability** ⚠️ **CRITICAL**
   - File: `src/extension_shield/utils/extension.py:94-95, 101-102`
   - Impact: Arbitrary file write
   - Fix: Implement safe extraction (see section 5)

2. **Add SSRF protection** ⚠️ **CRITICAL**
   - Files: All `requests.get()` calls
   - Impact: Internal network access
   - Fix: Domain allowlist + private IP blocking

3. **Add authorization checks** ⚠️ **CRITICAL**
   - Files: `get_scan_results()`, `get_file_list()`, `get_file_content()`
   - Impact: Data leakage between users
   - Fix: Check ownership before returning data

4. **Implement global rate limiting** ⚠️ **HIGH**
   - File: `src/extension_shield/api/main.py`
   - Impact: DoS vulnerability
   - Fix: Add `slowapi` middleware

### High Priority

5. **Sanitize error messages in production**
6. **Move rate limits to database/Redis**
7. **Add zip extraction limits** (file count, total size, depth)
8. **Add max response size for HTTP downloads**

---

## Optional Hardening (Can Wait)

1. **Remove `unsafe-inline` from CSP** (requires nonce/hash implementation)
2. **Restrict CORS methods/headers** to specific lists
3. **Add request logging** (without secrets)
4. **Implement CSRF protection** for state-changing operations
5. **Add security headers monitoring** (e.g., SecurityHeaders.com)
6. **Implement request ID tracking** for audit trails

---

## Validation Commands

Run these commands locally to verify security posture:

```bash
# 1. Verify secrets not tracked
git ls-files | grep -E '^images/env$' || echo "✅ images/env not tracked"

# 2. Check for secrets in tracked files
git grep -n "sk-[A-Za-z0-9]\{20,\}" . | grep -v ".gitignore" | grep -v "template" || echo "✅ No API keys found"

# 3. Check security headers (requires running server)
curl -I http://localhost:8007/health | grep -i "x-content-type-options\|x-frame-options\|strict-transport-security"

# 4. Python dependency audit
pip install pip-audit
pip-audit

# 5. Node dependency audit
cd frontend && npm audit --audit-level=moderate

# 6. Check for zip-slip protection
grep -n "extractall\|ZipFile" src/extension_shield/utils/extension.py

# 7. Check for SSRF protection
grep -rn "requests\.get\|httpx\.get\|aiohttp\.get" src/extension_shield/core/ src/extension_shield/governance/

# 8. Check authorization on sensitive endpoints
grep -A5 "def get_scan_results\|def get_file_list\|def get_file_content" src/extension_shield/api/main.py
```

---

## Security Smoke Test Script

A minimal security validation script is available at `scripts/security_smoke.sh` (if created). Run it with:

```bash
chmod +x scripts/security_smoke.sh
./scripts/security_smoke.sh
```

This script checks:
- `images/env` not tracked
- No secret patterns in tracked files
- Optional: Security headers (if `HEALTHCHECK_URL` env var set)

---

## Conclusion

The ExtensionShield codebase has a **solid security foundation** with good practices in:
- Secrets management
- File upload validation
- Security headers (basic)
- Authentication (JWT/JWKS)

However, **critical vulnerabilities** exist that must be fixed before public release:
1. Zip-slip vulnerability in archive extraction
2. Missing SSRF protection
3. Missing authorization checks on sensitive endpoints
4. No global rate limiting

**Estimated effort to address critical issues:** 4-6 hours

**Recommended timeline:**
- Week 1: Fix critical vulnerabilities (zip-slip, SSRF, AuthZ)
- Week 2: Add rate limiting and error sanitization
- Week 3: Add CI security scanning and dependency audits
- Ongoing: Monitor and tighten security controls

---

**Report Generated:** 2025-01-30  
**Next Review:** After critical fixes implemented

