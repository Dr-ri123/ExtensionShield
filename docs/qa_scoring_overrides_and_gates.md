# QA: Scoring Overrides and Hard Gate Rules

This document answers the important scoring QA finding from the competitor benchmark export and provides the hard gate rules so the workbook’s `overall_calc` can match `overall_score` exactly.

---

## Why 4 rows are flagged as OVERRIDE/EXTRA-PENALTY

The stored **overall_score** can be lower than the **weighted layer sum** (security×0.5 + privacy×0.3 + governance×0.2) for two reasons:

1. **Gate penalties** – Applied to layer scores *before* the weighted sum. The export’s `security_score`, `privacy_score`, and `governance_score` are *already* post-penalty, so their weighted sum equals the overall score *unless* (2) applies.
2. **Coverage cap** – When SAST has no coverage (0 files scanned and no findings), overall is **capped at 80** and the decision is at least NEEDS_REVIEW. So:
   - Weighted sum (from the exported layer scores) can be e.g. 85.
   - Stored `overall_score` = 80.

The **4 OVERRIDE rows** are the 4 scans where this **coverage cap** was applied: SAST missing and the weighted sum was &gt; 80, so the displayed score is 80.

---

## Recommended data model (now implemented)

The scoring engine and export now expose an explicit breakdown so the system is defensible vs competitors and in enterprise reviews:

| Field | Meaning |
|-------|--------|
| **base_overall** | Weighted layer sum *before* gate penalties (sec×0.5 + priv×0.3 + gov×0.2). |
| **gate_penalty** | Points subtracted from that weighted sum by hard gate penalties (effect on overall). |
| **final_overall** | What you display; same as **overall_score**. Formula: after gate penalties, then apply coverage cap if applicable. |
| **gate_reasons[]** | Human-readable, auditable reasons for each triggered gate. |
| **coverage_cap_applied** | True when overall was capped (e.g. SAST missing → cap at 80). |
| **coverage_cap_reason** | Reason for the cap (e.g. "Limited analysis coverage (SAST missing) — review recommended"). |

So:

- **overall_score** = final_overall (what we display).
- **base_overall** − **gate_penalty** = weighted sum after gates (before coverage cap).
- If **coverage_cap_applied**: final_overall = min(that sum, 80). Otherwise final_overall = that sum.

---

## Hard gate rules (for the workbook)

Use these so `overall_calc` in the workbook matches `overall_score` exactly and the “override” flags become a clear “gate penalty + coverage cap” breakdown.

### Gate ID → Layer and base penalty (points applied to layer score)

| Gate ID | Layer | Base penalty | Decision | Notes |
|---------|--------|--------------|----------|--------|
| **CRITICAL_SAST** | security | 50 | BLOCK | ≥1 critical or ≥3 high SAST findings (with critical-high patterns). |
| **VT_MALWARE** | security | 45 | BLOCK | ≥5 VT malicious; 1–4 = WARN. |
| **TOS_VIOLATION** | governance | 60 | BLOCK | Prohibited perms (debugger, proxy, nativeMessaging); travel-docs/visa automation risk. |
| **PURPOSE_MISMATCH** | governance | 45 | WARN/BLOCK | Claimed purpose vs credential/tracking patterns. |
| **SENSITIVE_EXFIL** | privacy | 40 | WARN | Sensitive permissions + network exfil + no disclosure. |

- Penalty is applied **per layer**; only the **maximum** penalty per layer is used (e.g. if both CRITICAL_SAST and VT_MALWARE trigger, security gets max(50, 45) = 50).
- **BLOCK** gates use full base penalty; **WARN** gates use 0.7× base penalty, then scaled by gate confidence.
- Adjusted layer score = max(0, layer_score − penalty). Then **overall_after_gates** = 0.5×security + 0.3×privacy + 0.2×governance (using adjusted layer scores).
- **gate_penalty** (exported) = base_overall − overall_after_gates.

### Coverage cap (not a gate, but an override)

- **Condition:** SAST missing coverage (0 files scanned and no deduped findings) and overall_after_gates &gt; 80.
- **Effect:** final_overall = 80; decision at least NEEDS_REVIEW.
- **Reason:** “Limited analysis coverage (SAST missing) — review recommended”.

### Workbook formula to match overall_score

1. **base_overall** = (if you have pre-penalty layer scores) 0.5×sec_raw + 0.3×priv_raw + 0.2×gov_raw. Otherwise use the exported **base_overall** when present.
2. **overall_after_gates** = base_overall − **gate_penalty** (or use exported post-penalty layer scores if you have them).
3. **overall_calc** = IF(**coverage_cap_applied**, MIN(overall_after_gates, 80), overall_after_gates).
4. **overall_calc** should equal **overall_score** for every row.

---

## Summary

- The 4 OVERRIDE rows are due to the **coverage cap** (SAST missing → cap at 80), not gate penalties.
- The data model now exposes **base_overall**, **gate_penalty**, **gate_reasons**, **coverage_cap_applied**, and **coverage_cap_reason** in the API and in the QA export.
- Use the **Hard gate rules** table above (and the same table in the “Scoring model” sheet of the export) to wire the workbook so **overall_calc** = **overall_score** and overrides are explained as gate penalty + coverage cap.
