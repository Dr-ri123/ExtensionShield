#!/usr/bin/env python3
"""
Tiny deterministic assertions for report_view_model invariants.

Checks:
- ALL_WEBSITES -> what_to_watch contains a broad-access mention
- external_sharing remains UNKNOWN when no evidence is present
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from extension_shield.core.report_view_model import build_report_view_model


def _pp(obj) -> str:
    return json.dumps(obj, indent=2, sort_keys=True)


def main() -> None:
    # Fixture A: ALL_WEBSITES, no network evidence/domains, no externally_connectable
    manifest_all = {
        "manifest_version": 3,
        "name": "AllUrls",
        "version": "1.0.0",
        "permissions": ["tabs", "storage"],
        "host_permissions": ["<all_urls>"],
    }
    analysis_results = {
        "permissions_analysis": {},
        "javascript_analysis": {"sast_findings": {}},
        "webstore_analysis": {},
        "virustotal_analysis": {},
        "entropy_analysis": {},
    }

    vm = build_report_view_model(
        manifest=manifest_all,
        analysis_results=analysis_results,
        metadata={},
        extension_id="test_ext_all",
        scan_id="test_scan_all",
    )

    what_to_watch = (vm.get("highlights") or {}).get("what_to_watch") or []
    assert isinstance(what_to_watch, list)
    combined = " ".join([str(x) for x in what_to_watch]).lower()
    assert any(term in combined for term in ["all websites", "broad", "all_urls", "<all_urls>", "*://*/*"]), (
        "Expected broad host access mention in what_to_watch.\n"
        f"what_to_watch={_pp(what_to_watch)}"
    )

    impact_cards = vm.get("impact_cards") or []
    ext_card = next((c for c in impact_cards if c.get("id") == "external_sharing"), None)
    assert ext_card is not None, "Missing external_sharing impact card"
    assert ext_card.get("risk_level") == "UNKNOWN", (
        "external_sharing must remain UNKNOWN when no evidence.\n"
        f"external_sharing={_pp(ext_card)}"
    )
    assert (ext_card.get("bullets") or []) == [], "external_sharing bullets must be empty when UNKNOWN/no evidence"

    print("✅ report_view_model assertions passed.")


if __name__ == "__main__":
    main()


