"""
Impact Analyzer

Generates user-facing impact buckets based on extension capabilities.
"""

import os
import json
import logging
import re
from typing import Dict, Optional, Any, List, Tuple
from urllib.parse import urlparse

from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from extension_shield.llm.prompts import get_prompts
from extension_shield.llm.clients.fallback import invoke_with_fallback
from extension_shield.llm.validators import validate_impact

load_dotenv()
logger = logging.getLogger(__name__)


class ImpactAnalyzer:
    """Generates impact analysis buckets from capabilities and scope."""

    NETWORK_KEYS = [
        "network_analysis",
        "network_behavior",
        "third_party_api_analysis",
        "urls_analysis",
    ]

    @staticmethod
    def _json_block(value: Any) -> str:
        """Serialize a value to a stable JSON block for prompt injection."""
        try:
            return json.dumps(value or {}, indent=2, sort_keys=True, ensure_ascii=True)
        except (TypeError, ValueError):
            return json.dumps(str(value), ensure_ascii=True)

    @staticmethod
    def _is_url_pattern(permission: str) -> bool:
        """Check if permission is a URL pattern."""
        if not isinstance(permission, str):
            return False
        url_indicators = ["://", "*://", "http://", "https://", "file://", "ftp://", "<all_urls>"]
        return any(indicator in permission for indicator in url_indicators)

    @staticmethod
    def _extract_host_permissions(manifest: Dict[str, Any]) -> List[str]:
        """Extract host permissions from manifest (MV2/MV3)."""
        host_permissions = manifest.get("host_permissions", []) or []
        if not host_permissions:
            permissions = manifest.get("permissions", []) or []
            host_permissions = [p for p in permissions if ImpactAnalyzer._is_url_pattern(p)]
        return [p for p in host_permissions if isinstance(p, str)]

    @staticmethod
    def _classify_host_access_scope(manifest: Dict[str, Any]) -> Dict[str, Any]:
        """Classify host access scope for authoritative prompt input."""
        broad_patterns = [
            "<all_urls>",
            "*://*/*",
            "http://*/*",
            "https://*/*",
            "file:///*",
        ]

        host_permissions = ImpactAnalyzer._extract_host_permissions(manifest)
        if not host_permissions:
            return {
                "host_scope_label": "NONE",
                "patterns_count": 0,
                "domains": [],
                "has_all_urls": False,
            }

        has_all_urls = "<all_urls>" in host_permissions
        has_broad = any(pattern in host_permissions for pattern in broad_patterns)
        if has_broad:
            return {
                "host_scope_label": "ALL_WEBSITES",
                "patterns_count": len(host_permissions),
                "domains": [],
                "has_all_urls": has_all_urls,
            }

        import re
        domains = set()
        for pattern in host_permissions:
            match = re.search(
                r"(?:https?://)?(?:\*\.)?([a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+)",
                pattern,
            )
            if match:
                domains.add(match.group(1).lower())

        top_domains = sorted(domains)[:10]
        if len(domains) == 1:
            return {
                "host_scope_label": "SINGLE_DOMAIN",
                "patterns_count": len(host_permissions),
                "domains": top_domains,
                "has_all_urls": has_all_urls,
            }
        return {
            "host_scope_label": "MULTI_DOMAIN",
            "patterns_count": len(host_permissions),
            "domains": top_domains,
            "has_all_urls": has_all_urls,
        }

    def _extract_external_domains(self, analysis_results: Dict[str, Any]) -> List[str]:
        """Extract external domains from any available network analysis payload."""
        payload = None
        for key in self.NETWORK_KEYS:
            if analysis_results.get(key):
                payload = analysis_results.get(key)
                break

        if payload is None:
            return []

        if isinstance(payload, list):
            raw_domains = payload
        elif isinstance(payload, dict):
            raw_domains = payload.get("domains", [])
        else:
            return []

        if not isinstance(raw_domains, list):
            return []

        domains: List[str] = []
        for domain in raw_domains:
            if not isinstance(domain, str) or not domain.strip():
                continue
            parsed = urlparse(domain if "://" in domain else f"https://{domain}")
            hostname = parsed.hostname
            if hostname:
                domains.append(hostname.lower())

        # Dedupe and cap
        return list(dict.fromkeys(domains))[:100]

    @staticmethod
    def _extract_network_evidence_from_sast(javascript_analysis: Any) -> List[Dict[str, Any]]:
        """
        Extract a small set of network evidence objects from SAST findings.

        This is used as optional evidence for `impact_analysis` to avoid over-claiming
        external sharing when no evidence is provided.
        """
        if not isinstance(javascript_analysis, dict):
            return []

        sast_findings = javascript_analysis.get("sast_findings") or {}
        if not isinstance(sast_findings, dict):
            return []

        url_re = re.compile(r"https?://[^\s\"')`]+", re.IGNORECASE)
        evidence: List[Dict[str, Any]] = []

        for file_path, findings in sast_findings.items():
            if not isinstance(findings, list):
                continue
            for finding in findings:
                if not isinstance(finding, dict):
                    continue

                check_id = str(finding.get("check_id", "")).lower()
                extra = finding.get("extra") or {}
                message = str(extra.get("message", ""))
                category = str((extra.get("metadata") or {}).get("category", "")).lower()

                is_networkish = (
                    "third_party" in check_id
                    or "external_api" in check_id
                    or "third-party" in category
                    or "external domains" in message.lower()
                )
                if not is_networkish:
                    continue

                url_match = url_re.search(message) or url_re.search(str(extra.get("lines", "")))
                url = url_match.group(0) if url_match else None
                domain_match = re.search(
                    r"https?://([a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+)",
                    url or "",
                    re.IGNORECASE,
                )
                domain = domain_match.group(1).lower() if domain_match else None

                evidence.append(
                    {
                        "source": "sast",
                        "check_id": finding.get("check_id"),
                        "file": file_path,
                        "line": (finding.get("start") or {}).get("line"),
                        "message": message[:200],
                        "url": (url[:200] if isinstance(url, str) else None),
                        "domain": domain,
                    }
                )

        return evidence[:20]

    def _compute_capability_flags(
        self,
        manifest: Dict[str, Any],
        analysis_results: Dict[str, Any],
        host_access_summary: Dict[str, Any],
        external_domains: List[str],
        network_evidence: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, bool]:
        """Compute deterministic capability flags for impact analysis."""
        permissions = manifest.get("permissions", []) or []
        api_permissions = [
            p for p in permissions
            if isinstance(p, str) and not self._is_url_pattern(p)
        ]
        host_permissions = self._extract_host_permissions(manifest)
        host_scope_label = host_access_summary.get("host_scope_label", "NONE")

        content_scripts = manifest.get("content_scripts", []) or []
        web_accessible_resources = manifest.get("web_accessible_resources", []) or []

        screenshot_analysis = (
            analysis_results.get("permissions_analysis", {}) or {}
        ).get("screenshot_capture_analysis", {}) or {}
        screenshot_detected = bool(screenshot_analysis.get("detected", False))

        has_content_scripts = bool(content_scripts)
        has_web_accessible_resources = bool(web_accessible_resources)
        can_read_sites = host_scope_label in ("ALL_WEBSITES", "MULTI_DOMAIN", "SINGLE_DOMAIN")

        # Evidence-based external domain connection check
        network_evidence = network_evidence or []
        has_externally_connectable = bool(manifest.get("externally_connectable"))
        can_connect_external = (
            bool(external_domains) or 
            bool(network_evidence) or 
            has_externally_connectable
        )

        return {
            # Data access
            "can_read_all_sites": host_scope_label == "ALL_WEBSITES",
            "can_read_specific_sites": host_scope_label in ("SINGLE_DOMAIN", "MULTI_DOMAIN"),
            "can_read_page_content": can_read_sites or has_content_scripts,
            "can_read_cookies": "cookies" in api_permissions,
            "can_read_history": "history" in api_permissions,
            "can_read_clipboard": "clipboardRead" in api_permissions,
            "can_read_downloads": "downloads" in api_permissions,
            "can_read_tabs": "tabs" in api_permissions or "activeTab" in api_permissions,
            "can_capture_screenshots": screenshot_detected or any(
                p in api_permissions for p in ["desktopCapture", "tabCapture"]
            ),
            # Browser control
            "can_modify_page_content": has_content_scripts or any(
                p in api_permissions for p in ["scripting", "activeTab"]
            ),
            "can_inject_scripts": has_content_scripts or "scripting" in api_permissions,
            "can_block_or_modify_network": any(
                p in api_permissions
                for p in [
                    "webRequest",
                    "webRequestBlocking",
                    "declarativeNetRequest",
                    "declarativeNetRequestWithHostAccess",
                ]
            ),
            "can_manage_extensions": "management" in api_permissions,
            "can_control_proxy": "proxy" in api_permissions,
            "can_debugger": "debugger" in api_permissions,
            # External sharing - evidence-based
            "can_connect_external_domains": can_connect_external,
            "has_external_domains": bool(external_domains),
            "has_externally_connectable": has_externally_connectable,
            "has_web_accessible_resources": has_web_accessible_resources,
        }

    def _get_prompt_template(
        self,
        analysis_results: Dict[str, Any],
        manifest: Dict[str, Any],
        extension_id: Optional[str],
    ) -> PromptTemplate:
        """Create prompt template for impact analysis."""
        template_str = get_prompts("impact_analysis.yaml")
        template_str = template_str.get("impact_analysis")
        if not template_str:
            raise ValueError("Impact analysis prompt template not found")

        host_access_summary = self._classify_host_access_scope(manifest)
        external_domains = self._extract_external_domains(analysis_results)
        network_evidence = self._extract_network_evidence_from_sast(
            analysis_results.get("javascript_analysis")
        )
        capability_flags = self._compute_capability_flags(
            manifest=manifest,
            analysis_results=analysis_results,
            host_access_summary=host_access_summary,
            external_domains=external_domains,
            network_evidence=network_evidence,
        )

        extension_name = manifest.get("name", "Unknown Extension")
        extension_description = manifest.get("description", "")

        template = PromptTemplate(
            input_variables=[
                "extension_id",
                "extension_name",
                "extension_description",
                "host_access_summary_json",
                "capability_flags_json",
                "external_domains_json",
                "network_evidence_json",
                "content_scripts_json",
                "web_accessible_resources_json",
            ],
            template=template_str,
            template_format="jinja2",
        ).partial(
            extension_id=extension_id or "unknown",
            extension_name=extension_name,
            extension_description=extension_description,
            host_access_summary_json=self._json_block(host_access_summary),
            capability_flags_json=self._json_block(capability_flags),
            external_domains_json=self._json_block(external_domains),
            network_evidence_json=self._json_block(network_evidence),
            content_scripts_json=self._json_block(manifest.get("content_scripts", []) or []),
            web_accessible_resources_json=self._json_block(
                manifest.get("web_accessible_resources", []) or []
            ),
        )

        return template

    def generate(
        self,
        analysis_results: Dict[str, Any],
        manifest: Dict[str, Any],
        extension_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Generate impact analysis from manifest + analyzer outputs."""
        if not manifest:
            logger.warning("No manifest data provided for impact analysis")
            return None

        prompt = self._get_prompt_template(
            analysis_results=analysis_results or {},
            manifest=manifest or {},
            extension_id=extension_id,
        )

        model_name = os.getenv("LLM_MODEL", "rits/openai/gpt-oss-20b")
        model_parameters = {
            "temperature": 0.05,
            "max_tokens": 1024,
        }

        try:
            formatted_prompt = prompt.format_prompt()
            messages = formatted_prompt.to_messages()

            response = invoke_with_fallback(
                messages=messages,
                model_name=model_name,
                model_parameters=model_parameters,
            )

            parser = JsonOutputParser()
            impact = parser.parse(response.content if hasattr(response, "content") else str(response))
            
            # Validate against authoritative signals
            host_access_summary = self._classify_host_access_scope(manifest)
            external_domains = self._extract_external_domains(analysis_results)
            network_evidence = self._extract_network_evidence_from_sast(
                analysis_results.get("javascript_analysis")
            )
            capability_flags = self._compute_capability_flags(
                manifest=manifest,
                analysis_results=analysis_results,
                host_access_summary=host_access_summary,
                external_domains=external_domains,
                network_evidence=network_evidence,
            )
            
            if isinstance(impact, dict):
                validation = validate_impact(
                    output=impact,
                    capability_flags=capability_flags,
                    external_domains=external_domains,
                    network_evidence=network_evidence,
                )
                
                if not validation.ok:
                    logger.warning(
                        "LLM impact analysis validation failed, using fallback. Reasons: %s",
                        "; ".join(validation.reasons),
                    )
                    # Return deterministic fallback
                    from extension_shield.core.report_view_model import _fallback_impact_from_capability_flags
                    return _fallback_impact_from_capability_flags(
                        capability_flags=capability_flags,
                        external_domains=external_domains,
                        network_evidence=network_evidence,
                        has_externally_connectable=bool(manifest.get("externally_connectable")),
                    )
            
            logger.info("Impact analysis generated successfully")
            return impact
        except Exception as exc:
            # Avoid noisy stack traces in normal operation; callers can fall back deterministically.
            logger.warning("Failed to generate impact analysis: %s", exc)
            return None

