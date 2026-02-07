#!/usr/bin/env python3
"""
Validation test script for Summary v4 and Impact v2.
Tests host access scope computation and validates outputs.
"""

import json
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from extension_shield.core.summary_generator import SummaryGenerator


def test_host_access_scope_all_urls():
    """Test A: ALL_WEBSITES scope computation"""
    print("=" * 80)
    print("TEST A: ALL_WEBSITES Scope")
    print("=" * 80)
    
    manifest = {
        "manifest_version": 3,
        "name": "Test Extension",
        "version": "1.0.0",
        "host_permissions": ["<all_urls>"]
    }
    
    generator = SummaryGenerator()
    result = generator._classify_host_access_scope(manifest)
    
    print("\n✅ Host Access Summary JSON:")
    print(json.dumps(result, indent=2))
    
    assert result["host_scope_label"] == "ALL_WEBSITES", f"Expected ALL_WEBSITES, got {result['host_scope_label']}"
    assert result["has_all_urls"] == True, "Expected has_all_urls=True"
    print("\n✅ Test A passed: ALL_WEBSITES correctly detected")


def test_host_access_scope_single_domain():
    """Test B: SINGLE_DOMAIN scope computation"""
    print("\n" + "=" * 80)
    print("TEST B: SINGLE_DOMAIN Scope")
    print("=" * 80)
    
    manifest = {
        "manifest_version": 3,
        "name": "Test Extension",
        "version": "1.0.0",
        "host_permissions": [
            "https://example.com/*",
            "https://*.example.com/*"
        ]
    }
    
    generator = SummaryGenerator()
    result = generator._classify_host_access_scope(manifest)
    
    print("\n✅ Host Access Summary JSON:")
    print(json.dumps(result, indent=2))
    
    assert result["host_scope_label"] == "SINGLE_DOMAIN", f"Expected SINGLE_DOMAIN, got {result['host_scope_label']}"
    assert result["has_all_urls"] == False, "Expected has_all_urls=False"
    assert len(result["domains"]) == 1, f"Expected 1 domain, got {len(result['domains'])}"
    print("\n✅ Test B passed: SINGLE_DOMAIN correctly detected")


def test_host_access_scope_multi_domain():
    """Test C: MULTI_DOMAIN scope computation"""
    print("\n" + "=" * 80)
    print("TEST C: MULTI_DOMAIN Scope")
    print("=" * 80)
    
    manifest = {
        "manifest_version": 3,
        "name": "Test Extension",
        "version": "1.0.0",
        "host_permissions": [
            "https://example.com/*",
            "https://test.com/*",
            "https://demo.com/*"
        ]
    }
    
    generator = SummaryGenerator()
    result = generator._classify_host_access_scope(manifest)
    
    print("\n✅ Host Access Summary JSON:")
    print(json.dumps(result, indent=2))
    
    assert result["host_scope_label"] == "MULTI_DOMAIN", f"Expected MULTI_DOMAIN, got {result['host_scope_label']}"
    assert result["has_all_urls"] == False, "Expected has_all_urls=False"
    assert len(result["domains"]) >= 2, f"Expected 2+ domains, got {len(result['domains'])}"
    print("\n✅ Test C passed: MULTI_DOMAIN correctly detected")


if __name__ == "__main__":
    try:
        test_host_access_scope_all_urls()
        test_host_access_scope_single_domain()
        test_host_access_scope_multi_domain()
        print("\n" + "=" * 80)
        print("✅ ALL VALIDATION TESTS PASSED")
        print("=" * 80)
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

