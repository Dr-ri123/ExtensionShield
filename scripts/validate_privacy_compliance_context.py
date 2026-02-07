#!/usr/bin/env python3
"""
Deterministic (no-LLM) validation for PrivacyComplianceAnalyzer context injection.

Validates:
- host_access_summary_json classification
- capability_flags_json derivation
- SAST-derived network evidence extraction
- optional code string scans for storage/cookies usage
"""

import json
import tempfile
from pathlib import Path

from extension_shield.core.privacy_compliance_analyzer import PrivacyComplianceAnalyzer


def _pp(obj) -> str:
    return json.dumps(obj, indent=2, sort_keys=True)


def run():
    analyzer = PrivacyComplianceAnalyzer()

    # -------------------------------------------------------------------------
    # Test A: ALL_WEBSITES scope, no evidence
    # -------------------------------------------------------------------------
    manifest_all = {
        "manifest_version": 3,
        "name": "AllUrls",
        "version": "1.0.0",
        "permissions": ["storage"],
        "host_permissions": ["<all_urls>"],
    }
    analysis_results_empty = {}

    host = analyzer._classify_host_access_scope(manifest_all)
    domains_sast, net_evidence = analyzer._extract_network_evidence_from_sast(None)
    flags = analyzer._compute_capability_flags(
        manifest=manifest_all,
        analysis_results=analysis_results_empty,
        host_access_summary=host,
        external_domains=[],
    )

    print("=" * 80)
    print("TEST A: ALL_WEBSITES + no evidence")
    print("host_access_summary_json:\n", _pp(host))
    print("capability_flags_json (subset):\n", _pp({k: flags.get(k) for k in [
        "can_read_all_sites",
        "can_read_specific_sites",
        "can_read_page_content",
        "can_read_cookies",
        "has_external_domains",
    ]}))
    print("sast_domains:", domains_sast)
    print("network_evidence:", net_evidence)

    assert host["host_scope_label"] == "ALL_WEBSITES"
    assert host["has_all_urls"] is True
    assert flags["can_read_all_sites"] is True
    assert flags["has_external_domains"] is False

    # -------------------------------------------------------------------------
    # Test B: SAST network evidence extraction
    # -------------------------------------------------------------------------
    javascript_analysis = {
        "sast_findings": {
            "content.js": [
                {
                    "check_id": "banking.third_party.external_api_calls",
                    "path": "content.js",
                    "start": {"line": 10, "col": 1},
                    "extra": {
                        "severity": "ERROR",
                        "message": "Third-party API call detected via fetch: fetch('https://api.example.com/data')",
                        "metadata": {"category": "third-party-api"},
                        "lines": "fetch('https://api.example.com/data')",
                    },
                }
            ]
        }
    }
    domains_sast, net_evidence = analyzer._extract_network_evidence_from_sast(javascript_analysis)

    print("\n" + "=" * 80)
    print("TEST B: SAST network evidence extraction")
    print("sast_domains:\n", _pp(domains_sast))
    print("network_evidence:\n", _pp(net_evidence))

    assert "api.example.com" in domains_sast
    assert len(net_evidence) >= 1

    # -------------------------------------------------------------------------
    # Test C: Code string scan (storage/cookies)
    # -------------------------------------------------------------------------
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        (root / "background.js").write_text(
            "chrome.storage.local.get(['x'], () => {});\nchrome.cookies.getAll({}, () => {});\n",
            encoding="utf-8",
        )
        storage_scan = analyzer._scan_code_usage(td, needles=["chrome.storage", "browser.storage"])
        cookies_scan = analyzer._scan_code_usage(td, needles=["chrome.cookies", "browser.cookies"])

        print("\n" + "=" * 80)
        print("TEST C: Code string scan")
        print("storage_scan:\n", _pp(storage_scan))
        print("cookies_scan:\n", _pp(cookies_scan))

        assert storage_scan.get("hits", 0) > 0
        assert cookies_scan.get("hits", 0) > 0

    print("\n✅ All deterministic privacy_compliance context validations passed.")


if __name__ == "__main__":
    run()


