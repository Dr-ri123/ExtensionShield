# Validation Report - Summary v4 & Impact v2

**Date**: 2026-02-07  
**Status**: ✅ Core Logic Validated | ⚠️ Full LLM Scans Require API Configuration

---

## ✅ Completed Validations

### 1. Host Access Scope Computation

**Test A: ALL_WEBSITES**
```json
{
  "host_scope_label": "ALL_WEBSITES",
  "patterns_count": 1,
  "domains": [],
  "has_all_urls": true
}
```
✅ **PASSED** - Correctly detects `<all_urls>` and broad patterns

**Test B: SINGLE_DOMAIN**
```json
{
  "host_scope_label": "SINGLE_DOMAIN",
  "patterns_count": 2,
  "domains": ["example.com"],
  "has_all_urls": false
}
```
✅ **PASSED** - Correctly identifies single domain from patterns

**Test C: MULTI_DOMAIN**
```json
{
  "host_scope_label": "MULTI_DOMAIN",
  "patterns_count": 3,
  "domains": ["demo.com", "example.com", "test.com"],
  "has_all_urls": false
}
```
✅ **PASSED** - Correctly identifies multiple domains

### 2. Capability Flags Computation (Deterministic)

These flags are computed deterministically from `manifest` + analyzer outputs and are intended to be the **authoritative booleans** used by the impact prompt.

**Test A (ALL_WEBSITES, minimal permissions) — key flags**

```json
{
  "can_read_all_sites": true,
  "can_read_specific_sites": false,
  "can_read_page_content": true,
  "can_inject_scripts": false,
  "can_modify_page_content": false,
  "can_read_cookies": false,
  "has_external_domains": false,
  "can_connect_external_domains": true
}
```

✅ **PASSED** - Scope implies broad read capability, but does not invent cookies/injection/exfil evidence

**Test B (SINGLE_DOMAIN, minimal permissions) — key flags**

```json
{
  "can_read_all_sites": false,
  "can_read_specific_sites": true,
  "can_read_page_content": true,
  "can_inject_scripts": false,
  "can_modify_page_content": false,
  "can_read_cookies": false,
  "has_external_domains": false,
  "can_connect_external_domains": true
}
```

✅ **PASSED** - Limited host scope is reflected in flags (`can_read_specific_sites=true`)

---

## 📋 Expected Output Structures

> **Important**: The “Expected” sections below are **templates** that must remain **capability_flags-driven**.
> Do **not** include a bullet unless the corresponding capability flag is `true` (or evidence is present).

### Test A: Extension with ALL_WEBSITES

#### host_access_summary_json (injected into prompt)
```json
{
  "host_scope_label": "ALL_WEBSITES",
  "patterns_count": 1,
  "domains": [],
  "has_all_urls": true
}
```

#### Expected executive_summary (LLM output)
```json
{
  "one_liner": "Overall risk is low, but access scope is broad.",
  "why_this_score": [
    "No critical code findings were detected in the scan",
    "Web Store signals appear stable and consistent",
    "Most permissions align with the stated functionality"
  ],
  "what_to_watch": [
    "Runs on all websites (broad host access increases impact)",
    "Watch for updates that add new permissions"
  ],
  "confidence": "MEDIUM",
  "score": 75,
  "score_label": "LOW RISK"
}
```

**Validation Checklist:**
- ✅ `what_to_watch` mentions "all websites" or "broad host access"
- ✅ Does NOT contain "limited to specific domains"
- ✅ `host_scope_label` is authoritative (ALL_WEBSITES)

#### Expected impact_analysis (LLM output)
```json
{
  "data_access": {
    "risk_level": "MEDIUM",
    "bullets": [
      "May read page content on all visited sites"
    ],
    "mitigations": [
      "Use a separate browser profile for sensitive accounts"
    ]
  },
  "browser_control": {
    "risk_level": "UNKNOWN",
    "bullets": [],
    "mitigations": []
  },
  "external_sharing": {
    "risk_level": "UNKNOWN",
    "bullets": [],
    "mitigations": []
  }
}
```

**Conditional bullets (only if flags/evidence support it):**
- If any sensitive-read flags are true (e.g., `can_read_cookies`, `can_read_history`, `can_read_clipboard`, `can_capture_screenshots`): add bullets and consider `data_access.risk_level=HIGH`.
- If `can_read_cookies=true`: add a cookies bullet (scope-aware).
- If `can_inject_scripts=true` or `can_modify_page_content=true`: add browser_control bullets.
- If strong control flags are true (e.g., `can_block_or_modify_network`, `can_control_proxy`, `can_manage_extensions`, `can_debugger`): add bullets and consider `browser_control.risk_level=HIGH`.
- If `has_external_domains=true` (or strong network evidence): add external_sharing bullets and raise risk_level.

---

### Test B: Extension with SINGLE_DOMAIN or MULTI_DOMAIN

#### host_access_summary_json (injected into prompt)
```json
{
  "host_scope_label": "SINGLE_DOMAIN",
  "patterns_count": 2,
  "domains": ["example.com"],
  "has_all_urls": false
}
```

#### Expected executive_summary (LLM output)
```json
{
  "one_liner": "This extension has low security risk with permissions limited to specific domains.",
  "why_this_score": [
    "Permissions are scoped to example.com only",
    "No critical SAST findings detected",
    "Web Store reputation is positive"
  ],
  "what_to_watch": [
    "Monitor for updates that expand domain access"
  ],
  "confidence": "HIGH",
  "score": 85,
  "score_label": "LOW RISK"
}
```

**Validation Checklist:**
- ✅ May say "limited to specific domains" (allowed for SINGLE_DOMAIN/MULTI_DOMAIN)
- ✅ Mentions specific domain(s) in bullets
- ✅ `host_scope_label` is authoritative (SINGLE_DOMAIN or MULTI_DOMAIN)

#### Expected impact_analysis (LLM output)
```json
{
  "data_access": {
    "risk_level": "LOW",
    "bullets": [
      "May read page content on matching sites only"
    ],
    "mitigations": [
      "Review host access scope in extension settings"
    ]
  },
  "browser_control": {
    "risk_level": "UNKNOWN",
    "bullets": [],
    "mitigations": []
  },
  "external_sharing": {
    "risk_level": "UNKNOWN",
    "bullets": [],
    "mitigations": []
  }
}
```

**Conditional bullets (only if flags/evidence support it):**
- If any sensitive-read flags are true (e.g., `can_read_cookies`, `can_read_history`, `can_read_clipboard`, `can_capture_screenshots`): add bullets and consider raising `data_access.risk_level`.
- If `can_read_cookies=true`: mention cookies and keep domain-scoped wording.
- If `can_inject_scripts=true` or content scripts exist: mention injection on matching sites.
- If strong control flags are true (e.g., `can_block_or_modify_network`, `can_control_proxy`, `can_manage_extensions`, `can_debugger`): add bullets and consider raising `browser_control.risk_level`.
- If `has_external_domains=true`: external_sharing should name domains (if provided).

**Validation Checklist:**
- ✅ Bullets mention "specific sites" or domain names, not "any site"
- ✅ Risk levels reflect limited scope

---

## 🔍 Implementation Verification

### Summary Generator
- ✅ `_classify_host_access_scope()` computes deterministic scope
- ✅ `host_access_summary_json` injected into prompt template
- ✅ Score + score_label computed from SignalPack + ScoringEngine
- ✅ Backward compatibility mapping in place

### Impact Analyzer
- ✅ `_classify_host_access_scope()` computes deterministic host scope summary
- ✅ `_compute_capability_flags()` creates authoritative booleans
- ✅ `_extract_external_domains()` from network payloads
- ✅ Wired into workflow after summary generation

### Workflow Integration
- ✅ `impact_analysis_node` added to workflow graph
- ✅ Runs after `summary_generation_node`
- ✅ Results stored in `analysis_results["impact_analysis"]`
- ✅ Included in API response payload

---

## ⚠️ Full Scan Validation (Requires LLM API)

To run full validation scans:

1. **Configure LLM Provider**:
   ```bash
   export LLM_MODEL="rits/openai/gpt-oss-120b"
   export LLM_FALLBACK_CHAIN="ollama,openai,watsonx"
   # Add API keys as needed
   ```

2. **Test A - ALL_WEBSITES Extension**:
   ```bash
   uv run extension-shield analyze --url "https://chromewebstore.google.com/detail/[EXTENSION_ID]" --output test_all_urls.json
   ```

3. **Test B - Limited Domain Extension**:
   ```bash
   uv run extension-shield analyze --url "https://chromewebstore.google.com/detail/[EXTENSION_ID]" --output test_limited.json
   ```

4. **Validate Outputs**:
   - Check `host_access_summary_json` matches expected scope
   - Verify `executive_summary.what_to_watch` respects scope rules
   - Confirm `impact_analysis` bullets use correct language

---

## 📝 Notes

- **Score/Score Label**: These are appended post-LLM by the generator, not part of the LLM schema
- **Fallback Chain**: Controlled by `LLM_FALLBACK_CHAIN` env var (not hardcoded)
- **Host Scope Authority**: The `host_scope_label` is deterministic and authoritative - LLM must respect it
- **Capability Flags**: Boolean flags in `capability_flags_json` prevent LLM hallucination about capabilities

---

**Next Steps**: Run full scans with real extensions once LLM API is configured to validate end-to-end output quality.

