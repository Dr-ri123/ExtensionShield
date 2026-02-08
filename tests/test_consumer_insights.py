import pytest


from extension_shield.core.report_view_model import build_consumer_insights, build_report_view_model


def _row_by_id(insights: dict, row_id: str) -> dict:
    rows = insights.get("safety_label", [])
    return next(r for r in rows if r.get("id") == row_id)


def _scenario_ids(insights: dict) -> set[str]:
    return {s.get("id") for s in insights.get("scenarios", []) if isinstance(s, dict)}


def test_safety_labels_match_capability_flags_and_host_scope():
    insights = build_consumer_insights(
        scoring_v2={},  # not needed for these assertions
        capability_flags={
            "can_read_cookies": True,
            "can_read_history": True,
            "can_read_tabs": False,
            "can_modify_page_content": False,
            "can_inject_scripts": False,
            "can_connect_external_domains": False,
            "can_capture_screenshots": False,
        },
        host_access_summary={"host_scope_label": "ALL_WEBSITES"},
        permissions_analysis={},
        webstore_metadata={},
        network_evidence=[],
        external_domains=[],
    )

    assert _row_by_id(insights, "host_scope")["value"] == "YES"
    assert _row_by_id(insights, "cookies")["value"] == "YES"

    history_tabs = _row_by_id(insights, "history_tabs")
    assert history_tabs["value"] == "YES"
    assert history_tabs["severity"] == "HIGH"  # history is treated as higher sensitivity than tabs


def test_scenarios_only_appear_when_triggers_match():
    base_kwargs = dict(
        scoring_v2={},
        permissions_analysis={},
        webstore_metadata={},
        network_evidence=[],
    )

    # cookies + broad + network
    insights = build_consumer_insights(
        **base_kwargs,
        capability_flags={"can_read_cookies": True},
        host_access_summary={"host_scope_label": "ALL_WEBSITES"},
        external_domains=["example.com"],
    )
    assert "cookies_broad_network" in _scenario_ids(insights)

    insights = build_consumer_insights(
        **base_kwargs,
        capability_flags={"can_read_cookies": True},
        host_access_summary={"host_scope_label": "SINGLE_DOMAIN"},
        external_domains=["example.com"],
    )
    assert "cookies_broad_network" not in _scenario_ids(insights)

    # inject scripts
    insights = build_consumer_insights(
        **base_kwargs,
        capability_flags={"can_inject_scripts": True},
        host_access_summary={"host_scope_label": "MULTI_DOMAIN"},
        external_domains=[],
    )
    assert "inject_scripts" in _scenario_ids(insights)

    insights = build_consumer_insights(
        **base_kwargs,
        capability_flags={"can_inject_scripts": False},
        host_access_summary={"host_scope_label": "MULTI_DOMAIN"},
        external_domains=[],
    )
    assert "inject_scripts" not in _scenario_ids(insights)

    # analytics / unknown domains
    insights = build_consumer_insights(
        **base_kwargs,
        capability_flags={},
        host_access_summary={"host_scope_label": "NONE"},
        external_domains=["www.google-analytics.com"],
    )
    assert "analytics_or_unknown_domains" in _scenario_ids(insights)

    insights = build_consumer_insights(
        **base_kwargs,
        capability_flags={},
        host_access_summary={"host_scope_label": "NONE"},
        external_domains=[],
    )
    assert "analytics_or_unknown_domains" not in _scenario_ids(insights)

    # capture + network
    insights = build_consumer_insights(
        **base_kwargs,
        capability_flags={"can_capture_screenshots": True},
        host_access_summary={"host_scope_label": "NONE"},
        external_domains=["example.com"],
    )
    assert "capture_plus_network" in _scenario_ids(insights)

    insights = build_consumer_insights(
        **base_kwargs,
        capability_flags={"can_capture_screenshots": True},
        host_access_summary={"host_scope_label": "NONE"},
        external_domains=[],
    )
    assert "capture_plus_network" not in _scenario_ids(insights)


def test_stale_obfuscated_low_trust_scenario_gate():
    scoring_v2 = {
        "security_layer": {
            "layer_name": "security",
            "score": 10,
            "risk": 0.9,
            "risk_level": "critical",
            "confidence": 0.9,
            "factors": [
                {
                    "name": "Maintenance",
                    "severity": 0.8,
                    "confidence": 0.9,
                    "weight": 0.1,
                    "contribution": 0.072,
                    "risk_level": "high",
                    "evidence_ids": ["maintenance:days:365"],
                    "details": {"days_since_update": 365},
                    "flags": ["stale_extension"],
                },
                {
                    "name": "Obfuscation",
                    "severity": 0.4,
                    "confidence": 0.9,
                    "weight": 0.15,
                    "contribution": 0.054,
                    "risk_level": "medium",
                    "evidence_ids": ["entropy:file:obfuscated.js"],
                    "details": {},
                    "flags": ["obfuscation_detected"],
                },
                {
                    "name": "Webstore",
                    "severity": 0.5,
                    "confidence": 0.9,
                    "weight": 0.1,
                    "contribution": 0.045,
                    "risk_level": "medium",
                    "evidence_ids": ["webstore:issue:low_users"],
                    "details": {"issues": ["low_users"]},
                    "flags": ["low_users"],
                },
            ],
        },
        "privacy_layer": {"layer_name": "privacy", "score": 50, "risk": 0.5, "risk_level": "medium", "confidence": 0.8, "factors": []},
        "governance_layer": {"layer_name": "governance", "score": 50, "risk": 0.5, "risk_level": "medium", "confidence": 0.8, "factors": []},
    }

    insights = build_consumer_insights(
        scoring_v2=scoring_v2,
        capability_flags={},
        host_access_summary={"host_scope_label": "NONE"},
        permissions_analysis={},
        webstore_metadata={},
        network_evidence=[],
        external_domains=[],
    )
    assert "stale_obfuscated_low_trust" in _scenario_ids(insights)

    # Lower trust signal below threshold -> scenario should not appear
    scoring_v2_low_trust = {
        **scoring_v2,
        "security_layer": {
            **scoring_v2["security_layer"],
            "factors": [
                *[f for f in scoring_v2["security_layer"]["factors"] if f["name"] != "Webstore"],
                {
                    "name": "Webstore",
                    "severity": 0.1,
                    "confidence": 0.9,
                    "weight": 0.1,
                    "contribution": 0.009,
                    "risk_level": "low",
                    "evidence_ids": [],
                    "details": {"issues": []},
                    "flags": [],
                },
            ],
        },
    }
    insights = build_consumer_insights(
        scoring_v2=scoring_v2_low_trust,
        capability_flags={},
        host_access_summary={"host_scope_label": "NONE"},
        permissions_analysis={},
        webstore_metadata={},
        network_evidence=[],
        external_domains=[],
    )
    assert "stale_obfuscated_low_trust" not in _scenario_ids(insights)


def test_top_drivers_ordering_and_count():
    scoring_v2 = {
        "security_layer": {
            "layer_name": "security",
            "score": 10,
            "risk": 0.9,
            "risk_level": "critical",
            "confidence": 0.9,
            "factors": [
                {
                    "name": "SAST",
                    "severity": 0.9,
                    "confidence": 1.0,
                    "weight": 0.3,
                    "contribution": 0.27,
                    "risk_level": "critical",
                    "evidence_ids": ["sast:CRITICAL:src/a.js"],
                    "details": {},
                    "flags": [],
                },
                {
                    "name": "Maintenance",
                    "severity": 0.6,
                    "confidence": 0.9,
                    "weight": 0.1,
                    "contribution": 0.054,
                    "risk_level": "high",
                    "evidence_ids": ["maintenance:days:200"],
                    "details": {"days_since_update": 200},
                    "flags": [],
                },
                {
                    "name": "Manifest",
                    "severity": 0.3,
                    "confidence": 1.0,
                    "weight": 0.1,
                    "contribution": 0.03,
                    "risk_level": "low",
                    "evidence_ids": ["manifest:issue:broad_host_access"],
                    "details": {},
                    "flags": [],
                },
            ],
        },
        "privacy_layer": {
            "layer_name": "privacy",
            "score": 10,
            "risk": 0.9,
            "risk_level": "critical",
            "confidence": 0.9,
            "factors": [
                {
                    "name": "NetworkExfil",
                    "severity": 0.6,
                    "confidence": 0.8,
                    "weight": 0.35,
                    "contribution": 0.168,
                    "risk_level": "high",
                    "evidence_ids": ["exfil:pattern:http"],
                    "details": {},
                    "flags": [],
                },
                {
                    "name": "PermissionsBaseline",
                    "severity": 0.5,
                    "confidence": 1.0,
                    "weight": 0.25,
                    "contribution": 0.125,
                    "risk_level": "medium",
                    "evidence_ids": ["perm:high_risk:cookies"],
                    "details": {},
                    "flags": [],
                },
            ],
        },
        "governance_layer": {
            "layer_name": "governance",
            "score": 10,
            "risk": 0.9,
            "risk_level": "critical",
            "confidence": 0.9,
            "factors": [
                {
                    "name": "DisclosureAlignment",
                    "severity": 0.7,
                    "confidence": 0.85,
                    "weight": 0.2,
                    "contribution": 0.119,
                    "risk_level": "high",
                    "evidence_ids": ["disclosure:no_privacy_policy_with_network"],
                    "details": {},
                    "flags": [],
                },
                {
                    "name": "ToSViolations",
                    "severity": 0.1,
                    "confidence": 0.9,
                    "weight": 0.5,
                    "contribution": 0.045,
                    "risk_level": "low",
                    "evidence_ids": ["tos:prohibited_perm:debugger"],
                    "details": {},
                    "flags": [],
                },
            ],
        },
    }

    insights = build_consumer_insights(
        scoring_v2=scoring_v2,
        capability_flags={},
        host_access_summary={"host_scope_label": "NONE"},
        permissions_analysis={},
        webstore_metadata={},
        network_evidence=[],
        external_domains=[],
    )

    drivers = insights.get("top_drivers", [])
    assert len(drivers) == 5  # capped to top 5

    # Descending by contribution
    contributions = [d["contribution"] for d in drivers]
    assert contributions == sorted(contributions, reverse=True)

    assert drivers[0]["name"] == "SAST"
    assert drivers[0]["layer"] == "security"
    assert "sast:CRITICAL:src/a.js" in drivers[0]["evidence_ids"]


def test_build_report_view_model_includes_consumer_insights():
    report = build_report_view_model(
        manifest={"name": "Test", "version": "1.0.0", "manifest_version": 3, "permissions": [], "host_permissions": []},
        analysis_results={},
        metadata={},
        extension_id="abcdefghijklmnopqrstuvwxzyabcdef",
        scan_id="scan_001",
    )
    assert "consumer_insights" in report
    assert set(report["consumer_insights"].keys()) == {"safety_label", "scenarios", "top_drivers"}


