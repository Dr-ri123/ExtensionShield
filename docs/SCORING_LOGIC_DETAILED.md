# ExtensionShield Scoring Logic - Detailed Documentation

## Overview

ExtensionShield uses a **multi-layer scoring system** to assess extension risk across three dimensions:
1. **Security** - Technical vulnerabilities and threats
2. **Privacy** - Data collection and exfiltration risks
3. **Compliance/Governance** - Policy compliance and behavioral consistency

The system uses **confidence-weighted aggregation** to account for uncertainty in different data sources.

---

## Architecture

### Two Scoring Systems

ExtensionShield currently has **two scoring implementations**:

1. **Legacy System** (`src/extension_shield/core/security_scorer.py`)
   - Simple point deduction system
   - Risk points accumulated and deducted from 100
   - No confidence weighting

2. **Current System** (`src/extension_shield/scoring/engine.py`) - **THE SINGLE SOURCE OF TRUTH**
   - Confidence-weighted aggregation
   - Normalized severity [0,1] and confidence [0,1]
   - Three-layer architecture (Security, Privacy, Governance)
   - Hard gates for clear-cut threats

**This document focuses on the current system (V2.0.0).**

---

## Mathematical Foundation

### Core Formula: Confidence-Weighted Risk Aggregation

For each layer (Security, Privacy, Governance), the risk is calculated as:

```
R = Σ(w_i × c_i × s_i) / Σ(w_i × c_i)
```

Where:
- `w_i` = weight of factor i (within the layer)
- `c_i` = confidence in factor i [0,1]
- `s_i` = severity of factor i [0,1]

The layer score is then:

```
Score = round(100 × (1 - R))
```

**Edge Cases:**
- If `Σ(w_i × c_i) == 0` (no data), return `score = 100` (no risk)
- Risk is clamped to [0, 1] before conversion

### Overall Score Calculation

The overall score is a weighted average of layer scores:

```
Overall = Security × 0.50 + Privacy × 0.30 + Governance × 0.20
```

**Layer Weights:**
- Security: 50% (primary concern)
- Privacy: 30% (secondary but important)
- Governance: 20% (policy compliance)

---

## Security Layer Scoring

### Security Factors and Weights

| Factor | Weight | Description |
|--------|--------|-------------|
| **SAST** | 0.30 | Static analysis findings (highest impact) |
| **VirusTotal** | 0.15 | Malware detection consensus |
| **Obfuscation** | 0.15 | Code obfuscation detection |
| **Manifest** | 0.10 | Manifest security configuration |
| **ChromeStats** | 0.10 | Behavioral threat intelligence |
| **Webstore** | 0.10 | Webstore reputation signals |
| **Maintenance** | 0.10 | Maintenance health (staleness) |

**Total:** 1.0

---

### 1. SAST (Static Analysis Security Testing)

**Normalizer:** `normalize_sast()`  
**Location:** `src/extension_shield/scoring/normalizers.py`

#### Formula

1. **Filter test files** - Excludes files matching test patterns
2. **Deduplicate** - By (rule_id, file_path, line_number)
3. **Weight findings:**
   - CRITICAL: 4.0
   - HIGH: 4.0
   - MEDIUM/ERROR: 2.0
   - WARNING: 0.5
   - INFO/LOW: 0.1

4. **Calculate weighted sum:**
   ```
   x = Σ(weights) after deduplication
   ```

5. **Compute severity using saturating exponential:**
   ```
   severity = 1 - exp(-0.08 × x)
   ```
   
   This provides **diminishing returns** - the first issues matter most.

6. **Determine confidence:**
   - Findings exist: `confidence = 1.0`
   - Analyzer missing (no files scanned): `confidence = 0.6`
   - Analyzer ran but no findings: `confidence = 0.8`

#### Example Calculation

```
Findings:
- 2 CRITICAL findings (weight 4.0 each)
- 1 HIGH finding (weight 4.0)
- 3 WARNING findings (weight 0.5 each)

x = (2 × 4.0) + (1 × 4.0) + (3 × 0.5) = 8 + 4 + 1.5 = 13.5

severity = 1 - exp(-0.08 × 13.5) = 1 - exp(-1.08) = 1 - 0.34 = 0.66

confidence = 1.0 (findings exist)

Contribution to security layer = 0.30 × 1.0 × 0.66 = 0.198
```

#### SAST Hard Gate (CRITICAL_SAST)

**Location:** `src/extension_shield/scoring/gates.py::evaluate_critical_sast()`

**Thresholds:**
- **≥1 CRITICAL finding:** `BLOCK` (immediate)
- **≥3 HIGH/ERROR findings:** `BLOCK` (immediate)
- Requires `confidence ≥ 0.7`

**Current Issue:** The gate correctly triggers on CRITICAL findings, but some HIGH-severity findings might warrant immediate BLOCK even if there are fewer than 3. For example:
- SQL injection patterns
- XSS vulnerabilities
- Remote code execution
- Credential theft patterns

**Recommendation:** Consider adding specific HIGH-severity check IDs that trigger BLOCK with just 1 finding, or lower the threshold to 2 HIGH findings.

---

### 2. VirusTotal

**Normalizer:** `normalize_virustotal()`  
**Location:** `src/extension_shield/scoring/normalizers.py`

#### Formula

**Malicious count mapping:**
- 0 detections → `severity = 0.0`
- 1 detection → `severity = 0.3`
- 2-4 detections → `severity = 0.6`
- 5-9 detections → `severity = 0.8`
- ≥10 detections → `severity = 1.0`

**Suspicious contribution:**
- Add `+0.05` per suspicious detection, capped at `+0.2`
- Final severity: `min(1.0, base_severity + suspicious_add)`

**Confidence:**
- Full scan (≥30 engines): `confidence = 1.0`
- Partial scan (<30 engines): `confidence = 0.7`
- Rate-limited/no data: `confidence = 0.4`

#### Example Calculation

```
Malicious: 3
Suspicious: 2

base_severity = 0.6 (2-4 range)
suspicious_add = min(0.2, 2 × 0.05) = 0.1
severity = min(1.0, 0.6 + 0.1) = 0.7

confidence = 1.0 (full scan)

Contribution = 0.15 × 1.0 × 0.7 = 0.105
```

#### VirusTotal Hard Gate (VT_MALWARE)

**Location:** `src/extension_shield/scoring/gates.py::evaluate_vt_malware()`

**Thresholds:**
- **≥5 malicious detections:** `BLOCK` (immediate)
- **1-4 malicious detections:** `WARN` (needs review)
- **0 malicious:** No gate (ALLOW)

**Confidence:**
- ≥50 engines: 0.98
- ≥30 engines: 0.95
- <30 engines: 0.85

---

### 3. Obfuscation (Entropy Analysis)

**Normalizer:** `normalize_entropy()`  
**Location:** `src/extension_shield/scoring/normalizers.py`

#### Formula

1. **Weighted sum:**
   ```
   x = 2 × obfuscated_files + 1 × suspicious_files
   ```

2. **Compute severity:**
   ```
   severity = 1 - exp(-0.2 × x)
   ```

3. **Confidence adjustment for popularity:**
   - Users ≥ 1M: `confidence × 0.6` (popular = likely legitimate minification)
   - Users ≥ 100K: `confidence × 0.7`
   - Else: `confidence = 0.9`

**Note:** Popularity affects **confidence**, not severity. Popular extensions may use legitimate build tools (webpack, etc.).

#### Example Calculation

```
Obfuscated files: 2
Suspicious files: 3
User count: 500,000

x = (2 × 2) + (1 × 3) = 4 + 3 = 7
severity = 1 - exp(-0.2 × 7) = 1 - exp(-1.4) = 1 - 0.25 = 0.75

Base confidence = 0.9
Adjusted confidence = 0.9 × 0.7 = 0.63 (popular extension)

Contribution = 0.15 × 0.63 × 0.75 = 0.071
```

---

### 4. Manifest Security Posture

**Normalizer:** `normalize_manifest_posture()`  
**Location:** `src/extension_shield/scoring/normalizers.py`

#### Formula

**Severity accumulation:**
- Missing CSP: `+0.3`
- MV2 legacy (manifest_version < 3): `+0.2`
- Broad host permissions (`<all_urls>`): `+0.3`
- Cap at `1.0`

**Confidence:** `1.0` if manifest parsed, `0.5` if missing

#### Example Calculation

```
Missing CSP: Yes
Manifest version: 2
Broad host access: Yes

severity = 0.3 + 0.2 + 0.3 = 0.8
confidence = 1.0

Contribution = 0.10 × 1.0 × 0.8 = 0.08
```

---

### 5. ChromeStats (Behavioral Threat Intelligence)

**Normalizer:** `normalize_chromestats()`  
**Location:** `src/extension_shield/scoring/normalizers.py`

#### Formula

Uses pre-calculated risk score from ChromeStats analyzer:

```
severity = 1 - exp(-0.1 × total_risk_score)
confidence = 0.8
```

**Risk indicators include:**
- Uninstall rate trends
- Rating pattern changes
- Developer reputation signals
- Install trend anomalies

---

### 6. Webstore Trust

**Normalizer:** `normalize_webstore_trust()`  
**Location:** `src/extension_shield/scoring/normalizers.py`

#### Formula

**Severity accumulation:**
- Rating < 2.0: `+0.4`
- Rating < 3.0: `+0.3`
- Rating < 3.5: `+0.15`
- Missing rating: `+0.1`
- Users < 100: `+0.3`
- Users < 1,000: `+0.2`
- Users < 10,000: `+0.1`
- Unknown users: `+0.15`
- Missing privacy policy: `+0.2`
- Cap at `1.0`

**Confidence:**
- Rating + users available: `0.9`
- One available: `0.6`
- Neither: `0.3`

---

### 7. Maintenance Health

**Normalizer:** `normalize_maintenance_health()`  
**Location:** `src/extension_shield/scoring/normalizers.py`

#### Formula

**Days since last update:**
- >365 days: `severity = 0.8` (stale)
- 180-365 days: `severity = 0.6` (aging)
- 90-180 days: `severity = 0.4` (needs update)
- <90 days: `severity = 0.1` (recently maintained)

**Confidence:** `0.9` if date available, `0.3` if missing

---

## Privacy Layer Scoring

### Privacy Factors and Weights

| Factor | Weight | Description |
|--------|--------|-------------|
| **NetworkExfil** | 0.35 | Network exfiltration patterns (highest privacy impact) |
| **PermissionCombos** | 0.25 | Dangerous permission combinations |
| **PermissionsBaseline** | 0.25 | Individual permission risk assessment |
| **CaptureSignals** | 0.15 | Screenshot/tab capture detection |

**Total:** 1.0

---

### 1. Network Exfiltration

**Normalizer:** `normalize_network_exfil()`  
**Location:** `src/extension_shield/scoring/normalizers.py`

#### Formula

**Domain risk accumulation:**
- Known good domains (CDNs): `+0.1` each
- Analytics domains: `+0.6` each
- Unknown external domains: `+0.5` each

**Pattern risk:**
- HTTP unencrypted: `+0.2`
- Base64 encoded URLs: `+0.3`
- High entropy payload: `+0.2`
- Dynamic URL construction: `+0.2`
- Credential exfil pattern: `+0.5`
- Data harvest pattern: `+0.4`
- Runtime URL construction: `+0.3`
- Data sending patterns: `+0.15` each (up to 5)

**Total risk sum:**
```
D = Σ(domain_risks) + Σ(pattern_risks)
```

**Severity:**
```
severity = 1 - exp(-0.25 × D)
```

**Confidence:** From NetworkSignalPack (0.5 if no analysis)

#### Example Calculation

```
Domains: ["analytics.google.com", "unknown-tracker.com"]
Patterns: HTTP unencrypted, credential exfil

D = 0.6 + 0.5 + 0.2 + 0.5 = 1.8
severity = 1 - exp(-0.25 × 1.8) = 1 - exp(-0.45) = 1 - 0.64 = 0.36

confidence = 0.9

Contribution = 0.35 × 0.9 × 0.36 = 0.113
```

---

### 2. Permission Combinations

**Normalizer:** `normalize_permission_combos()`  
**Location:** `src/extension_shield/scoring/normalizers.py`

#### Formula

**Dangerous combinations (severity additions):**
- `cookies + webRequest`: `+0.5`
- `cookies + webRequestBlocking`: `+0.6`
- `clipboardRead + webRequest`: `+0.4`
- `clipboardRead + <all_urls>`: `+0.4`
- `debugger + tabs`: `+0.7`
- `nativeMessaging`: `+0.7`
- `debugger`: `+0.5`
- Broad host access (`<all_urls>`): `+0.5`

**Severity:** Sum of triggered combos, capped at `1.0`

**Confidence:** `1.0` if permissions parsed, `0.5` if missing

#### Example Calculation

```
Permissions: ["cookies", "webRequest", "clipboardRead", "<all_urls>"]

Triggered combos:
- cookies + webRequest: +0.5
- clipboardRead + webRequest: +0.4
- clipboardRead + <all_urls>: +0.4
- Broad host access: +0.5

severity = min(1.0, 0.5 + 0.4 + 0.4 + 0.5) = 1.0
confidence = 1.0

Contribution = 0.25 × 1.0 × 1.0 = 0.25
```

---

### 3. Permissions Baseline

**Normalizer:** `normalize_permissions_baseline()`  
**Location:** `src/extension_shield/scoring/normalizers.py`

#### Formula

```
n = count(high_risk_permissions) + count(unreasonable_permissions)
severity = 1 - exp(-0.25 × n)
confidence = 1.0 if permissions parsed, 0.5 if missing
```

**High-risk permissions include:**
- `debugger`, `webRequest`, `webRequestBlocking`, `cookies`
- `clipboardRead`, `nativeMessaging`, `proxy`, `management`
- `desktopCapture`, `tabCapture`, `browsingData`, `history`

#### Example Calculation

```
High-risk permissions: ["cookies", "webRequest", "clipboardRead"]
Unreasonable permissions: ["debugger"]

n = 3 + 1 = 4
severity = 1 - exp(-0.25 × 4) = 1 - exp(-1.0) = 1 - 0.37 = 0.63

confidence = 1.0

Contribution = 0.25 × 1.0 × 0.63 = 0.158
```

---

### 4. Capture Signals

**Normalizer:** `normalize_capture_signals()`  
**Location:** `src/extension_shield/scoring/normalizers.py`

#### Formula

**Severity accumulation:**
- Capture permissions (`tabCapture`, `desktopCapture`, `activeTab`): `+0.2` each
- Screenshot detection in code: `+0.3`
- Context-aware adjustment:
  - **Disclosed screenshot tool** (name/desc mentions "screenshot"): `severity × 0.3` (reduce)
  - **Covert capture** (not disclosed): `severity × 1.5` (increase)
- Capture + network access: `+0.3`
- Cap at `1.0`

**Confidence:** `0.9` if manifest parsed, `0.5` if missing

#### Example Calculation

```
Permissions: ["tabCapture"]
Screenshot detected: Yes
Is disclosed tool: No
Has network access: Yes

Base severity = 0.2 + 0.3 = 0.5
Covert adjustment = 0.5 × 1.5 = 0.75
Network bonus = +0.3
Final severity = min(1.0, 0.75 + 0.3) = 1.0

confidence = 0.9

Contribution = 0.15 × 0.9 × 1.0 = 0.135
```

---

## Governance/Compliance Layer Scoring

### Governance Factors and Weights

| Factor | Weight | Description |
|--------|--------|-------------|
| **ToSViolations** | 0.50 | Terms of service violations (highest governance impact) |
| **Consistency** | 0.30 | Consistency between claimed and actual behavior |
| **DisclosureAlignment** | 0.20 | Privacy policy and disclosure alignment |

**Total:** 1.0

---

### 1. ToS Violations

**Normalizer:** `_compute_governance_factors()` (ToS factor)  
**Location:** `src/extension_shield/scoring/engine.py`

#### Formula

**Severity accumulation:**
- Prohibited permissions (`debugger`, `proxy`, `nativeMessaging`): `+0.5` each
- Broad access + VirusTotal detection: `+0.4`
- Cap at `1.0`

**Confidence:** `0.9`

**Prohibited permissions:**
- `debugger` - Often prohibited in enterprise
- `proxy` - Can intercept traffic
- `nativeMessaging` - Can bypass browser sandbox

#### Example Calculation

```
Permissions: ["debugger", "proxy"]
Has broad access + VT detection: Yes

severity = (0.5 × 2) + 0.4 = 1.0 (capped)
confidence = 0.9

Contribution = 0.50 × 0.9 × 1.0 = 0.45
```

---

### 2. Consistency

**Normalizer:** `_compute_governance_factors()` (Consistency factor)  
**Location:** `src/extension_shield/scoring/engine.py`

#### Formula

**Benign claims detection:**
- Keywords: "theme", "color", "font", "wallpaper", "new tab"
- If benign claimed + high security/privacy risk: `severity = 0.6`
- Offline claimed + network access: `severity = 0.4`
- Cap at `1.0`

**Confidence:** `0.8`

#### Example Calculation

```
Name: "Dark Theme Extension"
Description: "Beautiful dark theme for your browser"
Has high security risk: Yes

is_benign_claimed = True (contains "theme")
severity = 0.6
confidence = 0.8

Contribution = 0.30 × 0.8 × 0.6 = 0.144
```

---

### 3. Disclosure Alignment

**Normalizer:** `_compute_governance_factors()` (Disclosure factor)  
**Location:** `src/extension_shield/scoring/engine.py`

#### Formula

**Severity accumulation:**
- Missing privacy policy + data collection: `+0.5`
- Missing privacy policy + network access: `+0.3`
- Cap at `1.0`

**Confidence:** `0.85`

#### Example Calculation

```
Has privacy policy: No
Has data collection: Yes (high-risk permissions)
Has network access: Yes

severity = 0.5 (data collection takes precedence)
confidence = 0.85

Contribution = 0.20 × 0.85 × 0.5 = 0.085
```

---

## Hard Gates

Hard gates can **BLOCK** or **WARN** regardless of computed scores. They are evaluated in priority order and provide early decision overrides for high-confidence threats.

### Gate Priority Order

1. **VT_MALWARE** - VirusTotal malware detection
2. **CRITICAL_SAST** - Critical SAST findings
3. **TOS_VIOLATION** - Terms of Service violations
4. **PURPOSE_MISMATCH** - Claimed purpose vs actual behavior
5. **SENSITIVE_EXFIL** - Sensitive data exfiltration risk

### Gate Details

#### 1. VT_MALWARE

**Location:** `src/extension_shield/scoring/gates.py::evaluate_vt_malware()`

**Thresholds:**
- **≥5 malicious detections:** `BLOCK` (immediate)
- **1-4 malicious detections:** `WARN` (needs review)
- **0 malicious:** No gate (ALLOW)

**Confidence:**
- ≥50 engines: 0.98
- ≥30 engines: 0.95
- <30 engines: 0.85

---

#### 2. CRITICAL_SAST

**Location:** `src/extension_shield/scoring/gates.py::evaluate_critical_sast()`

**Current Thresholds:**
- **≥1 CRITICAL finding:** `BLOCK` (immediate)
- **≥3 HIGH/ERROR findings:** `BLOCK` (immediate)
- Requires `confidence ≥ 0.7`

**Issue Identified:** Some HIGH-severity findings should trigger immediate BLOCK even with fewer than 3 findings. Examples:
- SQL injection vulnerabilities
- XSS (Cross-Site Scripting) patterns
- Remote code execution risks
- Credential theft patterns
- DOM manipulation for data exfiltration

**Recommendation:**
1. Add a list of **critical HIGH-severity check IDs** that trigger BLOCK with just 1 finding
2. Lower the threshold to **≥2 HIGH findings** for BLOCK
3. Consider check ID patterns (e.g., `*:sql-injection:*`, `*:xss:*`) for automatic BLOCK

---

#### 3. TOS_VIOLATION

**Location:** `src/extension_shield/scoring/gates.py::evaluate_tos_violation()`

**Triggers BLOCK if:**
- Prohibited permissions: `debugger`, `proxy`, `nativeMessaging`
- `externally_connectable` allows all URLs (`<all_urls>`)

**Confidence:** `0.95`

---

#### 4. PURPOSE_MISMATCH

**Location:** `src/extension_shield/scoring/gates.py::evaluate_purpose_mismatch()`

**Triggers:**
- **BLOCK:** ≥2 credential capture patterns
- **WARN:** 1 credential capture pattern
- **WARN:** Benign-claimed extension with concerning capabilities (network + clipboard, capture, tracking)

**Confidence:** `0.8-0.85`

---

#### 5. SENSITIVE_EXFIL

**Location:** `src/extension_shield/scoring/gates.py::evaluate_sensitive_exfil()`

**Triggers WARN if 2+ risk factors:**
- Sensitive permissions (cookies, webRequest, history, etc.)
- Network access or network patterns in code
- Missing privacy policy

**Confidence:** `0.7`

---

## Final Decision Logic

**Location:** `src/extension_shield/scoring/engine.py::_determine_decision()`

### Decision Priority

1. **Any BLOCK gate** → `BLOCK`
2. **Security score < 30** → `BLOCK`
3. **Overall score < 30** → `BLOCK`
4. **Any WARN gate** → `NEEDS_REVIEW`
5. **Security score < 60** → `NEEDS_REVIEW`
6. **Overall score < 60** → `NEEDS_REVIEW`
7. **All pass** → `ALLOW`

### Score Thresholds

- **0-29:** Critical risk → `BLOCK`
- **30-59:** High risk → `NEEDS_REVIEW`
- **60-79:** Medium risk → `NEEDS_REVIEW` (if other factors present)
- **80-100:** Low risk → `ALLOW`

---

## Complete Example Calculation

### Input Data

```
SAST Findings:
- 1 CRITICAL (SQL injection)
- 2 HIGH (XSS patterns)
- 5 WARNING

VirusTotal:
- 2 malicious detections
- 45 engines scanned

Permissions:
- ["cookies", "webRequest", "clipboardRead", "<all_urls>"]

Manifest:
- Missing CSP
- MV2
- Has privacy policy: No

Network:
- 3 external domains (analytics.google.com, unknown-tracker.com, cdn.example.com)
- HTTP unencrypted pattern detected
```

### Step 1: Normalize Factors

#### Security Layer

**SAST:**
```
x = (1 × 4.0) + (2 × 4.0) + (5 × 0.5) = 4 + 8 + 2.5 = 14.5
severity = 1 - exp(-0.08 × 14.5) = 1 - exp(-1.16) = 1 - 0.31 = 0.69
confidence = 1.0
contribution = 0.30 × 1.0 × 0.69 = 0.207
```

**VirusTotal:**
```
base_severity = 0.6 (2-4 range)
severity = 0.6
confidence = 0.95 (≥30 engines)
contribution = 0.15 × 0.95 × 0.6 = 0.086
```

**Manifest:**
```
severity = 0.3 + 0.2 = 0.5 (missing CSP + MV2)
confidence = 1.0
contribution = 0.10 × 1.0 × 0.5 = 0.05
```

**Other factors (assumed):**
- Obfuscation: 0.0
- ChromeStats: 0.0
- Webstore: 0.0
- Maintenance: 0.0

**Security Layer Risk:**
```
R_security = (0.207 + 0.086 + 0.05) / (0.30 + 0.15 + 0.10) = 0.343 / 0.55 = 0.624
Security Score = round(100 × (1 - 0.624)) = round(37.6) = 38
```

#### Privacy Layer

**NetworkExfil:**
```
D = 0.6 + 0.5 + 0.1 + 0.2 = 1.4
severity = 1 - exp(-0.25 × 1.4) = 1 - exp(-0.35) = 1 - 0.70 = 0.30
confidence = 0.9
contribution = 0.35 × 0.9 × 0.30 = 0.095
```

**PermissionCombos:**
```
Triggered: cookies+webRequest (+0.5), clipboardRead+webRequest (+0.4), broad host (+0.5)
severity = min(1.0, 0.5 + 0.4 + 0.5) = 1.0
confidence = 1.0
contribution = 0.25 × 1.0 × 1.0 = 0.25
```

**PermissionsBaseline:**
```
n = 3 (high-risk permissions)
severity = 1 - exp(-0.25 × 3) = 1 - exp(-0.75) = 1 - 0.47 = 0.53
confidence = 1.0
contribution = 0.25 × 1.0 × 0.53 = 0.133
```

**CaptureSignals:**
```
severity = 0.0 (no capture)
contribution = 0.0
```

**Privacy Layer Risk:**
```
R_privacy = (0.095 + 0.25 + 0.133) / (0.35 + 0.25 + 0.25) = 0.478 / 0.85 = 0.562
Privacy Score = round(100 × (1 - 0.562)) = round(43.8) = 44
```

#### Governance Layer

**ToSViolations:**
```
severity = 0.0 (no prohibited permissions)
contribution = 0.0
```

**Consistency:**
```
severity = 0.0 (no benign claim mismatch)
contribution = 0.0
```

**DisclosureAlignment:**
```
severity = 0.5 (no privacy policy + data collection)
confidence = 0.85
contribution = 0.20 × 0.85 × 0.5 = 0.085
```

**Governance Layer Risk:**
```
R_governance = 0.085 / 0.20 = 0.425
Governance Score = round(100 × (1 - 0.425)) = round(57.5) = 58
```

### Step 2: Calculate Overall Score

```
Overall = (38 × 0.50) + (44 × 0.30) + (58 × 0.20)
        = 19 + 13.2 + 11.6
        = 43.8
        = 44 (rounded)
```

### Step 3: Evaluate Hard Gates

**CRITICAL_SAST Gate:**
- 1 CRITICAL finding → **BLOCK** triggered
- Confidence: 1.0 ≥ 0.7 ✓

**VT_MALWARE Gate:**
- 2 malicious detections → **WARN** triggered (1-4 range)

### Step 4: Final Decision

**Priority 1:** BLOCK gate triggered (CRITICAL_SAST) → **BLOCK**

**Final Result:**
- Security Score: 38/100
- Privacy Score: 44/100
- Governance Score: 58/100
- Overall Score: 44/100
- **Decision: BLOCK**
- **Reasons:**
  - "1 critical SAST finding(s) detected"
  - "VirusTotal flagged by 2 engine(s) - possible false positive or emerging threat"

---

## Recommendations for SAST Hard Alerts

### Current Issues

1. **HIGH-severity threshold too high:** Requires 3 HIGH findings to BLOCK, but some HIGH findings are critical enough to warrant immediate BLOCK
2. **No check ID whitelist:** All HIGH findings treated equally, regardless of specific vulnerability type
3. **Missing severity-specific patterns:** Some check IDs should always trigger BLOCK

### Proposed Changes

1. **Add critical HIGH-severity check IDs:**
   ```python
   CRITICAL_HIGH_CHECK_IDS = [
       "*:sql-injection:*",
       "*:xss:*",
       "*:rce:*",  # Remote code execution
       "*:credential-theft:*",
       "*:dom-manipulation:*",
   ]
   ```
   - If any HIGH finding matches these patterns → BLOCK immediately

2. **Lower HIGH threshold:**
   - Change from `≥3 HIGH` to `≥2 HIGH` for BLOCK

3. **Add severity-specific scoring:**
   - Some HIGH findings could be weighted higher in the normalizer (e.g., 5.0 instead of 4.0)

4. **Consider check ID metadata:**
   - Add a `critical_high` flag to certain check IDs in SAST config
   - Use this flag to trigger immediate BLOCK

### Implementation Example

```python
# In gates.py
CRITICAL_HIGH_PATTERNS = [
    r".*sql.*injection.*",
    r".*xss.*",
    r".*cross.*site.*scripting.*",
    r".*rce.*",
    r".*remote.*code.*execution.*",
    r".*credential.*theft.*",
    r".*keylog.*",
]

def evaluate_critical_sast(self, sast: SastSignalPack) -> GateResult:
    # ... existing code ...
    
    # Check for critical HIGH-severity patterns
    critical_high_count = 0
    for finding in high_findings:
        check_id_lower = finding.check_id.lower()
        if any(re.search(pattern, check_id_lower) for pattern in CRITICAL_HIGH_PATTERNS):
            critical_high_count += 1
    
    # Updated BLOCK thresholds
    should_block = (
        critical_count >= self.config.sast_critical_block_count or
        critical_high_count >= 1 or  # NEW: Any critical HIGH pattern
        high_count >= 2  # CHANGED: From 3 to 2
    )
```

---

## Summary

The ExtensionShield scoring system uses:

1. **Confidence-weighted aggregation** to account for uncertainty
2. **Three-layer architecture** (Security, Privacy, Governance)
3. **Saturating exponential formulas** for diminishing returns
4. **Hard gates** for clear-cut threats
5. **Normalized severity [0,1] and confidence [0,1]** for all factors

**Key Mathematical Formulas:**
- Layer Risk: `R = Σ(w_i × c_i × s_i) / Σ(w_i × c_i)`
- Layer Score: `Score = round(100 × (1 - R))`
- Overall Score: `Overall = Security × 0.50 + Privacy × 0.30 + Governance × 0.20`
- Severity (saturating): `severity = 1 - exp(-k × x)`

**SAST Hard Alert Recommendations:**
- Add critical HIGH-severity check ID patterns for immediate BLOCK
- Lower HIGH threshold from 3 to 2
- Consider check ID-specific metadata for critical findings

