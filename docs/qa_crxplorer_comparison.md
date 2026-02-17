# ExtensionShield vs Crxplorer – QA Comparison Results

This document summarizes the comparison between **ExtensionShield** and **Crxplorer** (CRX) scoring and capabilities. It is used for QA, investor/YC decks, and as a reference for scoring improvements. Extensionauditor is currently down and not included in this comparison.

---

## 1. Data source and scope

- **Our data:** Scans from the ExtensionShield DB (Supabase), with `scoring_v2` (overall, security, privacy, governance scores; decision ALLOW / NEEDS_REVIEW / BLOCK; risk_level).
- **Crxplorer data:** Manually entered from 32 CRX reports into `COMPETITOR_PREFILL` in `scripts/export_qa_scoring_excel.py`. Each entry has: `Crxplorer_score` (0–100), `Crxplorer_verdict` (Safe / Moderate / High Risk / Critical), `Crxplorer_notes`.
- **Comparison:** Only extensions that appear in our DB **and** have a Crxplorer prefill entry are compared. The Excel export adds: `score_diff` (our score − Crxplorer), `verdict_alignment` (Aligned / We stricter / We looser / No data), `divergence_notes`.

---

## 2. Crxplorer scoring model (reference)

Crxplorer uses a **0–100 score** and a **verdict** (Safe / Moderate / High Risk / Critical). Their breakdown includes:

| Category | Description |
|----------|-------------|
| **Permissions** | Data access scope – % Low/Medium/High/Critical risk |
| **Content Scripts** | Web interaction – where and how much the extension injects |
| **Web Accessible Resources (WAR)** | External assets – exposure to websites |
| **Content Security Policy (CSP)** | Security policy – presence/strength of CSP |
| **Externally Connectable** | Connections – which origins can message the extension |

They also provide **Impact Analysis**: Data Collection risk and Browser Access risk (Low / Medium / High). Key findings and best-practice recommendations are narrative.

- **Safe:** High score, minimal risk; Extension Verified often noted.
- **Moderate:** Review recommended; some concerning permissions or patterns.
- **High Risk / Critical:** Caution advised; broad permissions, missing CSP, or severe WAR/externally_connectable issues.

---

## 3. ExtensionShield scoring model (brief)

- **Layers:** Security (50%), Privacy (30%), Governance (20%) – configurable in `src/extension_shield/scoring/weights.py`.
- **Security:** Semgrep SAST, VirusTotal (malware gate), obfuscation, manifest/CSP, ChromeStats/behavioral.
- **Privacy:** Permissions, permission combos, network exfiltration, capture (mic/camera).
- **Governance:** ToS consistency, disclosure, evidence (governance_bundle).
- **Decisions:** ALLOW, NEEDS_REVIEW, BLOCK (with hard gates, e.g. VT malware → BLOCK).
- **Output:** `overall_score` (0–100), `risk_level` (LOW/MEDIUM/HIGH), `decision`.

---

## 4. Comparison metrics (in Excel)

| Metric | Meaning |
|--------|--------|
| **score_diff** | Our overall_score − Crxplorer_score. Positive = we score higher, negative = Crxplorer scores higher. |
| **verdict_alignment** | Aligned = same bucket; We stricter = we block/warn where they say Safe/Moderate; We looser = we allow where they say High/Critical. |
| **divergence_notes** | One-line summary for slides (e.g. "Our score +12 vs Crxplorer; Aligned"). |

Verdict mapping:

- **Our ALLOW** ↔ Crxplorer **Safe**
- **Our NEEDS_REVIEW** ↔ Crxplorer **Moderate**
- **Our BLOCK** ↔ Crxplorer **High Risk** or **Critical**

---

## 5. Findings – Where ExtensionShield is stronger

- **Semgrep SAST (47+ rules) + VirusTotal:** We run SAST and VT; we **block** on malware (hard gate). Crxplorer is score-only, no binary block.
- **Obfuscation:** We have obfuscation as a weighted factor; Crxplorer does not surface it the same way.
- **Hard gates:** We have deterministic BLOCK (e.g. VT malware); Crxplorer does not.
- **Privacy layer:** We model permission combos, network exfil, and capture (mic/camera) as factors; Crxplorer focuses on permissions and impact narrative.
- **Governance:** We have ToS consistency, disclosure, and an evidence bundle for audits; Crxplorer does not emphasize governance the same way.
- **Transparency:** Layer weights and factor weights are in the Excel “Scoring model” sheet and in code.

---

## 6. Where Crxplorer adds value (we could adopt)

- **5-category breakdown:** Permissions, Content Scripts, WAR, CSP, Externally Connectable with % risk (e.g. 90% Low). Good for UX and explaining “why” the score changed.
- **Impact analysis:** Data Collection / Browser Access risk level – we have underlying factors but could surface a similar high-level summary.
- **User-review sentiment:** Crxplorer sometimes summarizes store reviews in key findings; we have webstore_analysis but could highlight it more.

---

## 7. Pending in our scoring (improvements)

- **CSP strength:** Explicit 0–100% style score per category (similar to Crxplorer) for CSP.
- **Externally connectable:** Dedicated factor or sub-factor if not already covered.
- **Verdict buckets:** Optional Safe / Moderate / High / Critical labels for direct Crxplorer comparison and UX.

---

## 8. Excel export and YC deck

- **Script:** `uv run python scripts/export_qa_scoring_excel.py`
- **Output:** `qa_scoring_export.xlsx` in project root.

**Sheets:**

1. **Scans** – One row per scan; includes `extension_id`, `overall_score`, `risk_level`, `decision`, Crxplorer columns, `score_diff`, `verdict_alignment`, `divergence_notes`. Legacy counts (high/medium/low_risk_count) have been **removed**.
2. **Scoring model** – Layer and factor weights (ExtensionShield).
3. **What we have vs competitors** – Capability comparison (ExtensionShield vs Crxplorer/Extensionauditor).
4. **YC Comparison** – Summary metrics (N compared, mean score_diff, verdict counts), findings (where we’re stronger, where they add value, pending), chart data table, and a **bar chart** (Our score vs Crxplorer score for comparable extensions).

Use the **YC Comparison** sheet and chart for slides; use this doc as the written reference for methodology and future scoring work.

---

## 9. Updating the comparison

- Add or edit Crxplorer data in `COMPETITOR_PREFILL` in `scripts/export_qa_scoring_excel.py` (extension_id → Crxplorer_score, Crxplorer_verdict, Crxplorer_notes).
- Re-run the export script to regenerate the Excel and the YC Comparison sheet/chart.
- Extensionauditor columns are kept for when the service is available again; leave blank or fill when you have data.
