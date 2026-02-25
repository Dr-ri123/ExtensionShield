# UI/UX Simplification & LLM Data Flow — Change Log & Reference

This document describes **(1)** the UI/UX changes made to simplify the scan results experience, **(2)** the scoring engine and layer behavior (unchanged in logic, only display thresholds updated), and **(3)** how scoring data flows into the LLM generators and how to make their output easier and more understandable.

---

## Part 1: What Was Done (Summary of Changes)

### 1.1 Task 1 — Simplified Sidebar Tiles (Security / Privacy / Governance)

**Problem:** The right-side cards showed a large percentage (e.g. **84%**) that was confusing: users didn't know "84% of what," and it competed with the overall score on the left.

**Changes:**

| Location | Change |
|----------|--------|
| **`frontend/src/components/report/ResultsSidebarTile.jsx`** | Removed the big percentage number. Card now shows: **Icon + Title + Chevron** (row 1), **Verdict pill + findings count** (row 2), **Progress bar** (row 3). Added `ChevronRight` to indicate "click for details." |
| **`frontend/src/components/report/ResultsSidebarTile.scss`** | Removed `.tile-percent` and `.tile-percent-row`. Introduced `.tile-verdict-row`, `.tile-findings-badge`, `.tile-chevron`. Progress bar still uses numeric score for fill width but no number is displayed. |

**Result:** Users see a clear verdict ("Safe" / "Needs review" / "Not safe") and findings count; clicking a card opens the layer detail modal.

---

### 1.2 Task 2 — Relaxed Band Thresholds (Display Only)

**Problem:** "Safe" required score ≥ 85, which felt too strict (e.g. 80 showed "Needs review" despite being reasonably safe).

**New display thresholds (frontend only; scoring math unchanged):**

| Band | Old (display) | New (display) |
|------|----------------|---------------|
| **Safe** (GOOD) | 85–100 | **75–100** |
| **Needs Review** (WARN) | 60–84 | **50–74** |
| **Not Safe** (BAD) | 0–59 | **0–49** |

**Files updated:**

| File | Change |
|------|--------|
| **`frontend/src/constants/riskBands.js`** | `RISK_BAND_THRESHOLDS`: GOOD min 85→75, WARN 60–84→50–74, BAD 0–59→0–49. |
| **`frontend/src/utils/normalizeScanResult.ts`** | `bandFromScore()`: 85→75, 60→50. |
| **`frontend/src/components/report/DonutScore.jsx`** | Segment lengths and `ariaLabel` updated to 0–49 / 50–74 / 75–100. |
| **`frontend/src/utils/signalMapper.js`** | `getRiskLevel()`: 85→75, 60→50. |
| **`frontend/src/services/realScanService.js`** | `determineRiskLevel()`: 85→75, 60→50. |
| **`frontend/src/pages/scanner/ScannerPage.jsx`** | RiskBadge border/text colors: 85→75, 60→50. |
| **`frontend/src/pages/reports/ReportDetailPage.jsx`** | `getTrustLevel()`: 85→75, 60→50 (and 40→30 for Caution). |
| **`frontend/src/utils/signalMapper.test.js`** | Tests updated for new thresholds. |

**Backend:** Scoring formulas and `ScoringEngine` are **unchanged**. Only frontend band mapping and display text use the new thresholds. The backend `scoring/humanize.py` still uses 85/60 for `_get_risk_level_from_score` when building risk_level for API; if you want UI and API wording aligned, that function can be updated to 75/50 in a follow-up.

---

### 1.3 Task 3 — Redesigned Layer Modal (Security / Privacy / Governance Detail)

**Problem:** Modal showed a large numeric score (e.g. 84), long copy, and felt heavy.

**Changes:**

| Location | Change |
|----------|--------|
| **`frontend/src/components/report/LayerModal.jsx`** | Removed numeric score from header; only verdict pill remains. Check items are compact cards (label + status). Added **Info (i) icon** per check; hover/focus shows tooltip with full description. Shortened labels: "Clear" / "Issue", "Permissions", "Policies". `FACTOR_HUMAN` descriptions expanded for tooltips. |
| **`frontend/src/components/report/LayerModal.scss`** | Header simplified (no `.lm-score-num`). Body single column; compact `.lm-check-card`; tooltip styles for `.lm-info-trigger` / `.lm-info-tooltip`. Max width 420px. |

**Result:** Modal is short and scannable; technical explanations live behind the (i) icon so the main text stays simple.

---

## Part 2: Scoring Engine & Layers (Existing Behavior)

The **scoring engine and layer logic were not changed**. Only display thresholds and UI were updated. Below is a concise reference for how each layer is computed and what the UI consumes.

### 2.1 Data Flow (Engine → API → Frontend)

```
Extension (CRX / CWS URL / ID)
    ↓
Workflow: extension_analyzer_node → analysis_results, metadata, manifest
    ↓
governance_node:
    Pipeline 1: SignalPackBuilder.build() → SignalPack
    Pipeline 2: ScoringEngine.calculate_scores(signal_pack, manifest, user_count) → ScoringResult
    ↓
API: build_report_view_model_safe()
    → LayerDetailsGenerator.generate() or LayerHumanizer fallback → layer_details
    → build_unified_consumer_summary() or fallback → unified_summary
    ↓
Response: scoring_v2 + report_view_model
    ↓
Frontend: normalizeScanResult(raw) → scores, factorsByLayer, keyFindings
    → ResultsSidebarTile (verdict + findings), LayerModal (one_liner + checks)
```

### 2.2 Security Layer

| Aspect | Source | Notes |
|--------|--------|--------|
| **Score** | `ScoringResult.security_score` | `round(100 × (1 - R))`, R = confidence-weighted risk from security factors. |
| **Band** | `security_layer.risk_level` or score thresholds | Frontend now: ≥75 GOOD, 50–74 WARN, <50 BAD. |
| **Factors** | `scoring_v2.security_layer.factors` | 7 factors: SAST, VirusTotal, Obfuscation, Manifest, ChromeStats, Webstore, Maintenance. |
| **Factor fields** | `FactorScore`: name, severity, confidence, weight, contribution, evidence_ids, details, flags | Passed to LLM as JSON; frontend maps name → label/category via `FACTOR_HUMAN`. |

### 2.3 Privacy Layer

| Aspect | Source | Notes |
|--------|--------|--------|
| **Score** | `ScoringResult.privacy_score` | Same formula as security. |
| **Factors** | `scoring_v2.privacy_layer.factors` | 4 factors: PermissionsBaseline, PermissionCombos, NetworkExfil, CaptureSignals. |

### 2.4 Governance Layer

| Aspect | Source | Notes |
|--------|--------|--------|
| **Score** | `ScoringResult.governance_score` | From `_compute_governance_factors()`. |
| **Factors** | `scoring_v2.governance_layer.factors` | 3 factors: ToSViolations, Consistency, DisclosureAlignment. |

### 2.5 Key Backend Files (Unchanged for This Work)

| Purpose | File |
|---------|------|
| Signal extraction | `governance/tool_adapters.py`, `governance/signal_pack.py` |
| Severity/confidence per factor | `scoring/normalizers.py` |
| Layer scores, decision, gates | `scoring/engine.py`, `scoring/weights.py`, `scoring/gates.py` |
| Factor/layer models | `scoring/models.py` (FactorScore, LayerScore, ScoringResult) |

---

## Part 3: LLM Generators — Data From Scoring & Making Output Easier

Two main LLM flows consume scoring (and related) data and produce user-facing text. Making their output "easy and understandable" depends on **(a)** what data they get and **(b)** how the prompts and validators are tuned.

---

### 3.1 Layer Details Generator (Per-Layer One-Liner + Key Points + What to Watch)

**Role:** Produces the **one_liner**, **key_points**, and **what_to_watch** for Security, Privacy, and Governance used in the Quick Summary, TOP 3 FINDINGS, and the **Layer modal summary** (the short paragraph at the top of the Security/Privacy/Governance dialog).

**File:** `src/extension_shield/core/layer_details_generator.py`  
**Prompt:** `src/extension_shield/llm/prompts/layer_details_generation.yaml`  
**Fallback (no LLM):** `LayerHumanizer.generate_layer_details_fallback()` in `scoring/humanize.py`.

#### 3.1.1 Exact Data Passed From Scoring to the LLM

| Variable | Source | Content |
|----------|--------|--------|
| **security_score, privacy_score, governance_score** | `ScoringResult.security_score` etc. | Integer 0–100. |
| **security_risk_level, privacy_risk_level, governance_risk_level** | `_get_risk_level_from_score(score)` in `layer_details_generator.py` | **Currently** 85+ → LOW, 60–84 → MEDIUM, <60 → HIGH. (Not yet updated to 75/50; see recommendation below.) |
| **security_factors_json, privacy_factors_json, governance_factors_json** | `[factor.model_dump() for factor in scoring_result.*_layer.factors]` | Each factor: `name`, `severity`, `confidence`, `weight`, `evidence_ids`, `details`, `flags`. **Note:** `model_dump()` does not include computed `contribution` or `risk_level` unless you add them explicitly. |
| **security_gates_json, privacy_gates_json, governance_gates_json** | `_extract_layer_gates(gate_results, layer)` | For each triggered gate: `gate_id`, `decision`, `confidence`, `reasons`, `details`. |

Additional context (not from scoring, but used in the same prompt):

- **permissions_summary_json** — `analysis_results["permissions_analysis"]`
- **host_access_summary_json** — from manifest (e.g. ALL_WEBSITES, MULTI_DOMAIN)
- **sast_result_json** — `analysis_results["javascript_analysis"]`
- **network_evidence_json** — from SAST + network_analysis
- **manifest_json** — full manifest

So the LLM sees raw factor names (SAST, Maintenance, PermissionsBaseline, etc.), severity/confidence/weight numbers, and gate IDs. It does **not** get a pre-built "plain English" label per factor unless that is added to the payload (e.g. from a small mapping or from `details.description` if the engine fills it).

#### 3.1.2 Why Output Can Feel Hard to Understand

1. **Factor payload is technical** — Names like `PermissionsBaseline`, `NetworkExfil`, `ToSViolations` and numeric severity/confidence are passed as-is; the prompt asks the model to "translate to plain English," but the model may still echo jargon or percentages.
2. **Risk level in prompt is still 85/60** — The prompt says "LOW (85+)", "MEDIUM (60–84)", "HIGH (<60)". The UI now uses 75/50; the generator's internal risk level and prompt wording don't, so tone can feel off (e.g. "Needs review" in UI but "LOW" in prompt for 80).
3. **No explicit "contribution" or "top issue" hint** — The LLM sees all factors but isn't told which factor contributed most to the score; ordering or a short "top contributing factor" line would help it prioritize what to say.
4. **Validators are strict** — Bullets must reference "concrete signals" (gate IDs, permission names, factor names). That can push the model toward technical phrases to pass validation.

#### 3.1.3 Recommendations for Easier, More Understandable Layer Details

1. **Pass human-facing factor labels and a one-line "what this means" in the prompt**  
   - Either in `FactorScore.details` (e.g. `description`) from the engine, or in the generator by mapping `factor.name` to a short phrase (e.g. "Maintenance" → "How recently the extension was updated").  
   - Then in the prompt: "For each factor use the provided short description when mentioning it."

2. **Align risk level with UI**  
   - In `LayerDetailsGenerator._get_risk_level_from_score()` use **75/50** instead of 85/60.  
   - In `layer_details_generation.yaml`, update the "TONE BY RISK LEVEL" section to: LOW (75+), MEDIUM (50–74), HIGH (<50).

3. **Add "top contributing factor" per layer**  
   - Before calling the LLM, compute for each layer: sort factors by `contribution` (or severity×weight), take top 1–2.  
   - Pass e.g. `security_top_contributor: "Maintenance: extension not updated in over a year"` so the LLM can lead with that in the one_liner and key_points.

4. **Enrich factor JSON with a short description**  
   - When building `*_factors_json`, add a field like `plain_label` or `user_description` from a small table (e.g. Maintenance → "Update freshness"), so the model doesn't have to infer from "Maintenance" and severity only.

5. **Relax or refine validation**  
   - If validators force technical wording, consider allowing bullets that reference "plain_label" or a finding summary string, not only raw gate/factor names.

---

### 3.2 Unified Consumer Summary (Quick Summary: Headline + Narrative)

**Role:** Produces the **headline** and **narrative** for the Quick Summary block (and optionally tldr, concerns, recommendation). This is the first thing users read.

**File:** `src/extension_shield/core/report_view_model.py` — `build_unified_consumer_summary()`  
**Prompt:** `consumer_summary_unified` in `src/extension_shield/llm/prompts/summary_generation.yaml`  
**Fallback:** `_fallback_unified_consumer_summary()` in the same file.

#### 3.2.1 Exact Data Passed From Scoring / Report to the LLM

| Variable | Source | Content |
|----------|--------|--------|
| **extension_name** | `report_view_model["meta"]["name"]` or argument | Extension display name. |
| **score** | `scorecard["score"]` | Overall score 0–100. |
| **score_label** | `scorecard["score_label"]` | e.g. "LOW RISK", "MEDIUM RISK". |
| **security_score, privacy_score, governance_score** | `scoring_v2["security_layer"]["score"]` etc. | **Note:** In the current code these are read from `sec_layer.get("score")` etc. On `ScoringResult` the layer object has `.score`; in the serialized `scoring_v2` it may be under the layer key. Verify that the API actually sends layer-level `score` in `scoring_v2` so these are not None. |
| **decision** | `scoring_v2["decision"]` | ALLOW / WARN / BLOCK. |
| **key_findings_json** | Built in `build_unified_consumer_summary` | Merged list: `security_findings[:3] + privacy_findings[:3] + governance_findings[:3]`, plus hard_gates_triggered prefixed with "Gate:". |
| **security_findings_json, privacy_findings_json, governance_findings_json** | Same function | **Security/Privacy/Governance findings** come from: (1) `layer_details[layer].key_points`, and (2) scoring_v2 `*_layer.factors` with `severity >= 0.3`; each finding is factor `name` or `name + details.description`. So the unified summary LLM already receives a mix of layer_details (LLM or fallback) and raw factor names/descriptions. |

Also passed (not from scoring):

- **host_access_summary_json** — from evidence
- **permissions_json** — all_permissions, high_risk, host_access scope
- **what_it_can_do_json** — from `_build_what_it_can_do(manifest, analysis_results, host_access)`

So the Quick Summary LLM gets **already-built** findings (layer key_points + factor names/descriptions), not raw factor objects. If layer_details or factor descriptions are technical, the narrative will be too.

#### 3.2.2 Why Quick Summary Can Feel Hard to Understand

1. **Findings are still technical** — `security_findings` / `privacy_findings` / `governance_findings` are built from factor names and optional `details.description`. If the engine or layer_details doesn't supply plain-English descriptions, the unified summary sees strings like "Maintenance" or "PermissionsBaseline: high permission count" and may repeat that style.
2. **Tone by score in prompt is 85/60** — Prompt says "85+ = reassuring, 60–84 = cautious, <60 = direct warning." UI uses 75/50; aligning this avoids mismatched tone.
3. **No explicit "single main message"** — The model gets many findings and must infer what to lead with; a single "primary_concern" or "primary_recommendation" derived from scoring (e.g. from top contributing factor or gate) would make the headline and narrative more consistent and easier to understand.

#### 3.2.3 Recommendations for Easier Quick Summary

1. **Prefer plain-English findings when building security_findings / privacy_findings / governance_findings**  
   - When adding factors (severity ≥ 0.3), use a short human phrase from a mapping or from `details.user_description` if you add it in the engine (e.g. "Maintenance" → "Extension hasn't been updated in a long time"). Then the unified summary LLM receives user-friendly bullets and can weave them into the narrative without reinventing wording.

2. **Align tone with 75/50 in the prompt**  
   - In `summary_generation.yaml` for `consumer_summary_unified`, set: "Tone by score: 75+ = reassuring, 50–74 = cautious, <50 = direct warning."

3. **Pass a single "main takeaway" from scoring**  
   - Before calling the LLM, compute one sentence from: top gate (if any) or top contributing factor across layers. Pass it as e.g. `primary_concern` or `main_takeaway` and instruct: "Use this as the main message of the headline and the first sentence of the narrative."

4. **Ensure layer scores and decision are present**  
   - In `build_unified_consumer_summary`, confirm that `scoring_v2` and the nested layer objects expose `score` (and optionally `risk_level`). If the API uses different keys, map them so the prompt gets numeric security/privacy/governance scores and decision; this helps the model match tone to the actual result.

---

### 3.3 Single Place to Add "Plain English" for Factors (Shared by Both LLMs)

To make both layer details and Quick Summary easier and consistent:

- **Option A — In scoring engine:** When building `FactorScore`, set `details["description"]` (or a new `details["user_description"]`) to a single short, plain-English sentence (e.g. from a table keyed by factor name). Both LLMs already use `details` or factor names; they can be updated to prefer this field.
- **Option B — In report_view_model / layer_details_generator:** Keep a small mapping `FACTOR_NAME → plain_english_sentence` (or re-use the same table as the frontend `FACTOR_HUMAN` descriptions). When building findings for the unified summary or when building the layer_details prompt, append or substitute this sentence so the LLM always sees human-friendly text for each factor.

Doing one of these and aligning risk thresholds (75/50) and tone in both prompts will make the LLM output much more understandable without changing any scoring logic.

---

## Part 4: Quick Reference — Files Touched and LLM/Prompt Locations

### 4.1 Frontend (UI) — Changed in This Work

| File | Purpose |
|------|--------|
| `frontend/src/components/report/ResultsSidebarTile.jsx` | Sidebar tile: no %, verdict + findings, chevron. |
| `frontend/src/components/report/ResultsSidebarTile.scss` | Styles for new tile layout. |
| `frontend/src/components/report/LayerModal.jsx` | Modal: no score in header, compact cards, (i) tooltips. |
| `frontend/src/components/report/LayerModal.scss` | Modal and tooltip styles. |
| `frontend/src/constants/riskBands.js` | Band thresholds 75/50/49. |
| `frontend/src/utils/normalizeScanResult.ts` | `bandFromScore()` 75/50. |
| `frontend/src/components/report/DonutScore.jsx` | Segments and aria label 75/50. |
| `frontend/src/utils/signalMapper.js` | `getRiskLevel()` 75/50. |
| `frontend/src/services/realScanService.js` | `determineRiskLevel()` 75/50. |
| `frontend/src/pages/scanner/ScannerPage.jsx` | RiskBadge colors 75/50. |
| `frontend/src/pages/reports/ReportDetailPage.jsx` | `getTrustLevel()` 75/50. |
| `frontend/src/utils/signalMapper.test.js` | Tests for new thresholds. |

### 4.2 Backend — LLM and Data Flow (For Making Output Easier)

| File | Purpose |
|------|--------|
| `core/layer_details_generator.py` | Builds prompt from scoring + analysis; calls LLM; validates. Update `_get_risk_level_from_score` to 75/50; consider adding top contributor and plain-English factor descriptions. |
| `core/report_view_model.py` | `build_unified_consumer_summary()` builds findings from layer_details + scoring_v2 factors; calls LLM. Prefer plain-English findings; add primary_concern if desired. |
| `llm/prompts/layer_details_generation.yaml` | Layer details prompt. Update TONE BY RISK LEVEL to 75/50; add instructions to use plain-English factor descriptions if you pass them. |
| `llm/prompts/summary_generation.yaml` | `consumer_summary_unified` prompt. Update tone to 75/50; add primary_concern/main_takeaway if you pass it. |
| `scoring/humanize.py` | Fallback layer details when LLM fails. Optional: align `_get_risk_level_from_score` with 75/50 for consistency. |

### 4.3 Backend — Scoring (Unchanged in This Work)

| File | Purpose |
|------|--------|
| `scoring/engine.py` | ScoringEngine, layer and overall score, gates, decision. |
| `scoring/weights.py` | Factor and layer weights. |
| `scoring/normalizers.py` | Severity/confidence per factor. |
| `scoring/models.py` | FactorScore, LayerScore, ScoringResult. |

---

*This document summarizes the UI/UX simplification work and provides a precise reference for scoring → LLM data flow and for improving the clarity of LLM-generated copy.*
