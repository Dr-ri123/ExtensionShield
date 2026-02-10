# Extensions Storage and Database Architecture

## Overview

This document describes how ExtensionShield stores and manages scan data across the `extensions_storage` filesystem directory and the SQLite/Supabase database, including the lookup mechanism that prevents duplicate scans.

---

## Table of Contents

1. [Extensions Storage Directory](#extensions-storage-directory)
2. [SQLite Database Schema](#sqlite-database-schema)
3. [Data Flow: Scan to Storage](#data-flow-scan-to-storage)
4. [Lookup Mechanism: Preventing Duplicate Scans](#lookup-mechanism-preventing-duplicate-scans)
5. [Dashboard Data Display](#dashboard-data-display)
6. [Storage Backends](#storage-backends)

---

## Extensions Storage Directory

### Location

The `extensions_storage` directory is the root filesystem location for all extension-related artifacts. The path is configurable via the `EXTENSION_STORAGE_PATH` environment variable (defaults to `extensions_storage`).

**Configuration:**
```python
# src/extension_shield/core/config.py
extension_storage_path = os.environ.get("EXTENSION_STORAGE_PATH", "extensions_storage")
```

### Directory Structure

The `extensions_storage` directory contains:

1. **Result JSON Files**: `{extension_id}_results.json`
   - Complete scan results in JSON format
   - Contains all analysis data: metadata, manifest, permissions, SAST results, webstore analysis, summary, scoring, etc.
   - Used as a backup/fallback when database is unavailable

2. **Extracted Extension Directories**: `extracted_{filename}_{pid}/`
   - Extracted contents of CRX/ZIP files
   - Created during the extraction phase of analysis
   - Contains the full file tree of the extension for file viewing
   - Directory naming: `extracted_{base_name}_{process_id}`
   - Example: `extracted_cnofkjmkojconhdimlkamdckmidfmoio.crx_7777/`

3. **Uploaded Extension Files**: `{extension_id}_{sanitized_filename}`
   - Original CRX/ZIP files uploaded by users
   - Stored when users upload files directly (not from Chrome Web Store)

### Example Structure

```
extensions_storage/
├── cnofkjmkojconhdimlkamdckmidfmoio_results.json
├── extracted_cnofkjmkojconhdimlkamdckmidfmoio.crx_7777/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   └── ...
├── extracted_oligonmocnihangdjlloenpndnniikol.crx_7777/
│   └── ...
└── {extension_id}_{filename}.crx
```

### Extraction Process

Extensions are extracted to persistent storage (not `/tmp`) for file viewing capabilities:

```python
# src/extension_shield/utils/extension.py
def extract_extension_crx(file_path: str) -> Optional[str]:
    storage_path = get_settings().extension_storage_path
    extract_dir_name = f"extracted_{base_name}_{os.getpid()}"
    extract_dir = os.path.join(storage_path, extract_dir_name)
    # Extract CRX/ZIP contents with zip-slip protection
```

The `extracted_path` field in the database points to this directory, enabling the frontend to browse extension files.

---

## SQLite Database Schema

### Database Location

The SQLite database file location is configurable via `DATABASE_PATH` (defaults to `project-atlas.db`).

### Main Tables

#### 1. `scan_results` Table

Primary table storing all scan results. Uses `extension_id` as the unique primary key.

**Schema:**
```sql
CREATE TABLE scan_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extension_id TEXT UNIQUE NOT NULL,  -- Primary key for lookups
    extension_name TEXT,
    url TEXT,
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL,
    security_score INTEGER,
    risk_level TEXT,
    total_findings INTEGER DEFAULT 0,
    total_files INTEGER DEFAULT 0,
    high_risk_count INTEGER DEFAULT 0,
    medium_risk_count INTEGER DEFAULT 0,
    low_risk_count INTEGER DEFAULT 0,
    metadata TEXT,                      -- JSON string
    manifest TEXT,                      -- JSON string
    permissions_analysis TEXT,          -- JSON string
    sast_results TEXT,                  -- JSON string
    webstore_analysis TEXT,             -- JSON string
    summary TEXT,                      -- JSON string
    extracted_path TEXT,               -- Path to extracted extension directory
    extracted_files TEXT,              -- JSON array of file paths
    error TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_extension_id` on `extension_id` (for fast lookups)
- `idx_timestamp` on `timestamp DESC` (for recent scans)
- `idx_risk_level` on `risk_level` (for filtering)

**JSON Fields:**
The following fields are stored as JSON strings and parsed when retrieved:
- `metadata`
- `manifest`
- `permissions_analysis`
- `sast_results`
- `webstore_analysis`
- `summary`
- `extracted_files`

#### 2. `user_scan_history` Table

Tracks which users have scanned which extensions (for user-specific history).

```sql
CREATE TABLE user_scan_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    extension_id TEXT NOT NULL,
    created_at TEXT NOT NULL
);
```

**Index:**
- `idx_user_scan_history_user_created` on `(user_id, created_at DESC)`

#### 3. `statistics` Table

Aggregated metrics updated after each scan.

```sql
CREATE TABLE statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT UNIQUE NOT NULL,
    metric_value INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Default Metrics:**
- `total_scans`
- `high_risk_extensions`
- `total_files_analyzed`
- `total_vulnerabilities`

#### 4. `page_views_daily` Table

Privacy-first telemetry for page view counts.

```sql
CREATE TABLE page_views_daily (
    day TEXT NOT NULL,
    path TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, path)
);
```

---

## Data Flow: Scan to Storage

### Complete Scan Workflow

1. **User Triggers Scan** (`POST /api/scan/trigger`)
   - Extension ID extracted from Chrome Web Store URL
   - Check if already scanned (see [Lookup Mechanism](#lookup-mechanism-preventing-duplicate-scans))

2. **If New Scan:**
   - Download extension (CRX/ZIP) to `extensions_storage`
   - Extract extension to `extracted_{filename}_{pid}/`
   - Run analysis workflow (permissions, SAST, webstore, scoring, etc.)

3. **After Analysis Completes:**
   ```python
   # src/extension_shield/api/main.py:run_analysis_workflow()
   
   # 1. Store in memory cache
   scan_results[extension_id] = result_payload
   
   # 2. Save to database (SQLite or Supabase)
   db.save_scan_result(scan_results[extension_id])
   
   # 3. Save to file (backup)
   result_file = RESULTS_DIR / f"{extension_id}_results.json"
   with open(result_file, "w") as f:
       json.dump(scan_results[extension_id], f)
   
   # 4. Save to user history (if authenticated)
   db.add_user_scan_history(user_id=user_id, extension_id=extension_id)
   ```

### Storage Order of Operations

1. **Memory Cache** (fastest, ephemeral)
   - In-memory dictionary: `scan_results[extension_id]`
   - Used for active scans and recent lookups
   - Lost on server restart

2. **Database** (persistent, primary)
   - SQLite: `INSERT OR REPLACE` (upsert by `extension_id`)
   - Supabase: `upsert()` on `extension_id`
   - Primary source of truth for completed scans

3. **File System** (backup/fallback)
   - JSON file: `{extension_id}_results.json`
   - Used when database is unavailable
   - Also stores extracted extension directories

### Data Saved to Database

The `save_scan_result()` method stores:

- **Core Fields:**
  - `extension_id`, `extension_name`, `url`, `timestamp`, `status`
  - `security_score`, `risk_level`
  - `total_findings`, `total_files`
  - `high_risk_count`, `medium_risk_count`, `low_risk_count`

- **JSON Fields (stored as TEXT in SQLite, JSONB in Supabase):**
  - `metadata`: Extension metadata from Chrome Web Store
  - `manifest`: Parsed manifest.json
  - `permissions_analysis`: Permissions risk analysis
  - `sast_results`: Static analysis findings
  - `webstore_analysis`: Web store metadata analysis
  - `summary`: Executive summary
  - `extracted_files`: List of files in the extension

- **Paths:**
  - `extracted_path`: Path to extracted extension directory

---

## Lookup Mechanism: Preventing Duplicate Scans

### How It Works

When a user requests a scan, the system first checks if the extension has already been scanned. This prevents redundant analysis and improves performance.

### Lookup Function

```python
# src/extension_shield/api/main.py
def _has_cached_results(extension_id: str) -> bool:
    # 1. Check memory cache (fastest)
    if extension_id in scan_results:
        return True
    
    # 2. Check database (fast path for cached lookups)
    try:
        existing = db.get_scan_result(extension_id)
        if existing:
            return True
    except Exception:
        pass  # Fall back to file check
    
    # 3. Check file system (fallback)
    result_file = RESULTS_DIR / f"{extension_id}_results.json"
    return result_file.exists()
```

### Lookup Order

1. **Memory Cache** → `scan_results[extension_id]`
2. **Database** → `db.get_scan_result(extension_id)`
3. **File System** → `{extension_id}_results.json`

### Impact on Scan Flow

When `_has_cached_results()` returns `True`:

```python
# src/extension_shield/api/main.py:trigger_scan()
if _has_cached_results(extension_id):
    # Record user history (if authenticated)
    if user_id:
        db.add_user_scan_history(user_id=user_id, extension_id=extension_id)
    
    scan_status[extension_id] = "completed"
    return {
        "message": "Cached results available",
        "extension_id": extension_id,
        "status": "completed",
        "already_scanned": True,
        "scan_type": "lookup",  # Not a deep scan
    }
```

**Key Points:**
- ✅ **No deep scan consumption** (doesn't count against daily limits)
- ✅ **No analysis workflow execution** (saves time and resources)
- ✅ **User history is still recorded** (for user's personal scan history)
- ✅ **Returns immediately** with `scan_type: "lookup"`

### Data Storage Impact

**For Cached Lookups:**
- ❌ **No new data written** to database (existing row remains unchanged)
- ❌ **No new file created** (existing `{extension_id}_results.json` remains)
- ❌ **No new extraction** (existing `extracted_{filename}_{pid}/` remains)
- ✅ **User history entry created** (in `user_scan_history` table)

**For New Scans:**
- ✅ **New database row** created (or existing row updated via `INSERT OR REPLACE`)
- ✅ **New result file** written (or overwrites existing)
- ✅ **New extraction directory** created (old ones may remain)
- ✅ **User history entry created**

### Database Upsert Behavior

The database uses **upsert** semantics:

- **SQLite:** `INSERT OR REPLACE INTO scan_results (...)`
- **Supabase:** `upsert(row)` on `extension_id`

This means:
- If `extension_id` exists → **update** existing row
- If `extension_id` doesn't exist → **insert** new row

**Important:** The `extension_id` is the **primary key**, so each extension has exactly one row in the database. Re-scanning the same extension updates the existing row rather than creating duplicates.

---

## Dashboard Data Display

### Data Retrieval Flow

The dashboard retrieves data through a multi-tier lookup system:

#### 1. Frontend Request

```javascript
// frontend/src/services/databaseService.js
async getScanResult(extensionId) {
    const response = await fetch(`${this.API_BASE_URL}/scan/results/${extensionId}`);
    return await response.json();
}
```

#### 2. Backend Lookup (Priority Order)

```python
# src/extension_shield/api/main.py:get_scan_results()

# Priority 1: Memory cache
if extension_id in scan_results:
    return scan_results[extension_id]

# Priority 2: Database
results = db.get_scan_result(extension_id)
if results:
    # Format for frontend compatibility
    formatted_results = {...}
    scan_results[extension_id] = formatted_results  # Cache in memory
    return formatted_results

# Priority 3: File system (fallback)
result_file = RESULTS_DIR / f"{extension_id}_results.json"
if result_file.exists():
    results = json.load(f)
    scan_results[extension_id] = results  # Cache in memory
    return results

# Not found
raise HTTPException(status_code=404)
```

### Dashboard Components

#### 1. Recent Scans List

**Endpoint:** `GET /api/recent?limit=100`

**Backend:**
```python
# src/extension_shield/api/database.py
def get_recent_scans(self, limit: int = 10) -> List[Dict[str, Any]]:
    # Includes: metadata, sast_results, permissions_analysis, manifest
    # Avoids N+1 queries by including all needed data in one query
```

**Frontend Display:**
- Extension name, security score, risk level
- Total findings, total files
- Timestamp
- Links to full results page

#### 2. Scan History (User-Specific)

**Endpoint:** `GET /api/history?limit=50`

**Backend:**
```python
# Joins user_scan_history with scan_results
SELECT h.extension_id, r.extension_name, r.security_score, ...
FROM user_scan_history h
LEFT JOIN scan_results r ON r.extension_id = h.extension_id
WHERE h.user_id = ?
ORDER BY h.created_at DESC
```

**Frontend Display:**
- User's personal scan history
- Ordered by most recent first
- Shows cached lookups and new scans

#### 3. Dashboard Statistics

**Endpoint:** `GET /api/statistics`

**Metrics:**
- `total_scans`: Count of completed scans
- `high_risk_extensions`: Count of high-risk extensions
- `total_files_analyzed`: Sum of all files analyzed
- `total_vulnerabilities`: Sum of all findings
- `avg_security_score`: Average security score
- `risk_distribution`: `{high: X, medium: Y, low: Z}`

**Frontend Display:**
- Sparkline charts showing trends
- Metric cards with values
- Risk distribution pie chart

#### 4. Full Scan Results Page

**Endpoint:** `GET /api/scan/results/{extension_id}`

**Data Structure:**
```json
{
  "extension_id": "...",
  "extension_name": "...",
  "url": "...",
  "timestamp": "...",
  "status": "completed",
  "overall_security_score": 75,
  "overall_risk": "medium",
  "total_findings": 12,
  "risk_distribution": {"high": 2, "medium": 5, "low": 5},
  "metadata": {...},
  "manifest": {...},
  "permissions_analysis": {...},
  "sast_results": {...},
  "webstore_analysis": {...},
  "summary": {...},
  "extracted_path": "extensions_storage/extracted_...",
  "extracted_files": [...],
  "report_view_model": {...},  // Modern UI data model
  "scoring_v2": {...},          // V2 scoring engine results
  "governance_bundle": {...}    // Governance decisioning data
}
```

**Frontend Components:**
- `ScanResultsPageV2.jsx`: Main results page
- `ReportScoreCard`: Security score display
- `RiskDial`: Risk level visualization
- `KeyFindings`: Top security findings
- `PermissionsPanel`: Permissions analysis
- `FileViewerModal`: Browse extension files (uses `extracted_path`)

### Performance Optimizations

1. **N+1 Query Fix:**
   - `get_recent_scans()` includes all needed fields (metadata, sast_results, etc.) in one query
   - Avoids 26+ individual API calls per dashboard load

2. **Memory Caching:**
   - Results loaded from database are cached in memory
   - Subsequent requests for same extension_id use memory cache

3. **Database Indexes:**
   - `idx_extension_id`: Fast lookups by extension ID
   - `idx_timestamp`: Fast ordering for recent scans
   - `idx_risk_level`: Fast filtering by risk level

---

## Storage Backends

### SQLite (Default for Local/Dev)

- **File-based database:** `project-atlas.db`
- **JSON fields:** Stored as TEXT, parsed on retrieval
- **Upsert:** `INSERT OR REPLACE`
- **Best for:** Local development, single-server deployments

### Supabase (Production)

- **Cloud PostgreSQL:** Managed database
- **JSON fields:** Stored as JSONB (native JSON support)
- **Upsert:** `upsert()` method
- **Best for:** Production, multi-server deployments, ephemeral filesystems

### Backend Selection

```python
# src/extension_shield/core/config.py
if env == "prod":
    db_backend = "supabase" if (supabase_url and supabase_key) else "sqlite"
else:
    db_backend = "sqlite"  # Always SQLite for local/dev
```

The system automatically selects the backend based on environment variables and environment mode.

---

## Summary

### Key Takeaways

1. **Extensions Storage:**
   - Stores result JSON files, extracted extension directories, and uploaded files
   - Path configurable via `EXTENSION_STORAGE_PATH`

2. **SQLite Database:**
   - Primary storage for scan results
   - Uses `extension_id` as primary key (one row per extension)
   - JSON fields stored as TEXT, parsed on retrieval

3. **Lookup Mechanism:**
   - Checks memory → database → file system
   - Prevents duplicate scans
   - Cached lookups don't consume deep-scan limits
   - Updates existing database row (upsert) rather than creating duplicates

4. **Dashboard Display:**
   - Retrieves data from memory → database → file system (same priority)
   - Optimized queries prevent N+1 problems
   - User history tracks both cached lookups and new scans

5. **Data Storage Impact:**
   - **Cached lookups:** No new data written (existing data reused)
   - **New scans:** Full data written (database, file, extraction)
   - **Re-scans:** Database row updated (upsert), files may be overwritten

### File Locations

- **Database:** `{DATABASE_PATH}` (default: `project-atlas.db`)
- **Storage Root:** `{EXTENSION_STORAGE_PATH}` (default: `extensions_storage`)
- **Result Files:** `{EXTENSION_STORAGE_PATH}/{extension_id}_results.json`
- **Extracted Extensions:** `{EXTENSION_STORAGE_PATH}/extracted_{filename}_{pid}/`

---

## Related Documentation

- `docs/SCORING_ENGINE_DOCUMENTATION.md`: Scoring engine details
- `docs/LLM_PROMPTS_IMPLEMENTATION.md`: LLM analysis implementation
- `SCAN_WORKFLOW.md`: Complete scan workflow
- `docs/PERFORMANCE_FIX_DASHBOARD_LOADING.md`: Dashboard performance optimizations

