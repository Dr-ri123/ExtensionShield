# Acknowledgments

## Project Status & Attribution

**Important Note**: ExtensionShield is built on top of the **ThreatXtension** codebase. I took the original codebase and am actively developing on top of it. Since ThreatXtension was extension-focused, it seemed like a natural foundation to build upon and contribute to the security community.

**Current Status**:
- **Active Development**: This project is under active solo development
- **Original Rulesets**: My original custom rulesets and some configurations remain private
- **Public Components**: Modified code, enhanced privacy rulesets, and architectural improvements are public in this repository
- **Work in Progress**: Features and documentation are continuously being improved

**Note**: If you encounter any issues or have questions, please reach out at **snorzang65@gmail.com**

Thanks for your patience as I continue to enhance and expand this project!

## Foundation

ExtensionShield builds upon the pioneering work of **ThreatXtension** by Bar Haim and Itzik Chanan (https://github.com/barvhaim/ThreatXtension).

ThreatXtension provided the foundational architecture for Chrome extension security analysis, including:
- Core static analysis workflow (SAST with Semgrep)
- Permission risk assessment framework
- Initial scoring methodology
- Extension parsing and metadata extraction
- Custom security rules for malicious pattern detection

We are deeply grateful to Bar Haim, Itzik Chanan, and the ThreatXtension team for creating an excellent open-source foundation that enabled us to accelerate ExtensionShield's development. ThreatXtension serves as Pipeline 1 (Security Analysis) in our multi-dimensional approach.

## Key Enhancements in ExtensionShield

While based on ThreatXtension, ExtensionShield introduces significant architectural improvements:

### 1. **Scoring Architecture (V2)**
- **Three-Dimensional Scoring**: Separate Security, Privacy, and Governance scores (vs. single score)
- **Confidence-Weighted Model**: Normalized severity [0,1] × confidence [0,1] × category weight
- **Context-Aware Factors**: 
  - Screenshot detection (tool vs. covert behavior)
  - Permission-purpose alignment checking
  - Popularity-adjusted obfuscation scoring
- **Eliminated Score Collapse**: Proper normalization prevents 144-point dead zone
- **Hard Gates**: High-confidence threats bypass scoring (instant BLOCK)

**Details**: See `docs/scoring_v2_design.md` and `SCORING_ANALYSIS_REPORT.md`

### 2. **Evidence Chain-of-Custody**
- **SignalPack Architecture**: Normalized signals with provenance tracking
- **Governance Bundles**: Complete audit trails linking verdicts to specific code/manifest
- **Factor Explainability**: Every decision includes severity, confidence, weight, and contribution breakdown
- **Enforcement Bundles**: Exportable evidence packages for compliance/audit

**Implementation**: `src/extension_shield/governance/`

### 3. **ToS Compliance Analysis**
- Detection of Terms of Service violations (e.g., automation tools violating website ToS)
- Intent mismatch detection (stated purpose vs. actual behavior)
- Permission combination analysis (tracking/exfiltration patterns)

**Status**: Documented in `RISK_SCORING_ANALYSIS.md`

### 4. **Modern UI/UX**
- React + Vite frontend with real-time scan progress
- Evidence drawer with code snippet highlighting
- Three-score dashboard (Security/Privacy/Governance)
- PDF report generation
- Detailed factor breakdowns with visual indicators

**Location**: `frontend/src/`

### 5. **LangGraph Workflow Architecture**
- Stateful workflow orchestration
- Multi-node pipeline (metadata → download → analyze → govern → report)
- Governance layer integration with deterministic verdicts

**Implementation**: `src/extension_shield/workflow/`

## Collaboration

We welcome opportunities to contribute improvements back to ThreatXtension and collaborate with the security community.

If you're interested in any of these enhancements for ThreatXtension, please reach out: snorzang65@gmail.com

## GSoC Considerations

ThreatXtension's architecture and our enhancements make this an excellent candidate for Google Summer of Code projects, including:
- Browser extension support (Firefox, Safari, Edge)
- Real-time monitoring and alerting
- ML-based malware classification
- Policy pack customization
- Automated remediation workflows

See `/gsoc/ideas` for detailed project proposals.

---

**ExtensionShield** — Standing on the shoulders of ThreatXtension by Bar Haim & Itzik Chanan

