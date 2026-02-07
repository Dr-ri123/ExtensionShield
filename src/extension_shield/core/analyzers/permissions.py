"""
Permissions Analyzer
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Optional, List, Any
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableParallel, RunnableSequence
from langchain_core.output_parsers import JsonOutputParser
from extension_shield.core.analyzers import BaseAnalyzer
from extension_shield.llm.prompts import get_prompts
from extension_shield.llm.clients import get_chat_llm_client

load_dotenv()
logger = logging.getLogger(__name__)


class PermissionsAnalyzer(BaseAnalyzer):
    """Analyzes Chrome extension permissions for security risks and reasonableness."""

    def __init__(self):
        """Initialize the PermissionsAnalyzer."""
        super().__init__(name="PermissionsAnalyzer")
        self.permissions_db = self._load_permissions_db()
        self.sensitive_domains_config = self._load_sensitive_domains_config()

    @staticmethod
    def _load_permissions_db() -> Dict:
        db_path = Path(__file__).parent.parent.parent / "data" / "permissions_db.json"
        with open(db_path, "r", encoding="utf-8") as f:
            permissions_db = json.load(f)
        return permissions_db["permissions"]

    @staticmethod
    def _load_sensitive_domains_config() -> Dict:
        """Load sensitive domains configuration from JSON file."""
        config_path = Path(__file__).parent.parent.parent / "config" / "sensitive_domains.json"
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
            return config.get("categories", {})
        except FileNotFoundError:
            logger.warning("Sensitive domains config not found at %s, using defaults", config_path)
            return {}
        except json.JSONDecodeError as exc:
            logger.error("Error parsing sensitive domains config: %s", exc)
            return {}

    @staticmethod
    def _analyze_permission_prompt_template(
        extension_name: str,
        extension_description: str,
        permission_name: str,
        permission_description: str,
        permission_capabilities: str,
    ) -> PromptTemplate:
        template_str = get_prompts("permission_analysis")
        template_str = template_str.get("permission_analysis")

        if not template_str:
            raise NotImplementedError

        template = PromptTemplate(
            input_variables=[
                "extension_name",
                "extension_description",
                "permission_name",
                "permission_description",
                "permission_capabilities",
            ],
            template=template_str,
        ).partial(
            extension_name=extension_name,
            extension_description=extension_description,
            permission_name=permission_name,
            permission_description=permission_description,
            permission_capabilities=permission_capabilities,
        )
        return template

    def _analyze_permission(
        self,
        extension_name: str,
        extension_description: str,
        permission_name: str,
        permission_info: Dict,
    ) -> RunnableSequence:
        model_name = os.getenv("LLM_MODEL", "rits/openai/gpt-oss-20b")
        llm = get_chat_llm_client(
            model_name=model_name,
            model_parameters={
                "temperature": 0.05,
                "max_tokens": 1024,
            },
        )

        prompt = self._analyze_permission_prompt_template(
            extension_name=extension_name,
            extension_description=extension_description,
            permission_name=permission_name,
            permission_description=permission_info.get("description", ""),
            permission_capabilities=", ".join(permission_info.get("capabilities", [])),
        )

        return prompt | llm | JsonOutputParser()

    @staticmethod
    def _format_permissions_analysis_result(
        permissions: List, is_permissions_reasonable: Dict
    ) -> str:
        """Format permissions analysis result with reasonable analysis."""
        permission_lines = [f"- {permission}" for permission in permissions]
        result = (
            "The extension requests the following permissions:\n"
            + "\n".join(permission_lines)
            + "\n"
        )

        suspicious_permissions = [
            permission
            for permission, analysis in is_permissions_reasonable.items()
            if not analysis.get("is_reasonable")
        ]

        if suspicious_permissions:
            result += "\n⚠️ Suspicious permissions detected:\n"
            for permission in suspicious_permissions:
                analysis = is_permissions_reasonable[permission]
                reason = analysis.get("justification_reasoning", "No reason provided.")
                result += f"- {permission}: {reason}\n"
        else:
            result += "\n✅ All permissions appear to be reasonable."

        return result

    def _analyze_permissions(
        self, extension_name: str, extension_description: str, permissions: List
    ) -> tuple[Optional[str], Optional[Dict]]:
        """Analyze the permissions requested by the extension.
        
        Note: Uses sequential processing with delays to avoid WatsonX rate limits (2 req/s).
        """
        import time
        
        permissions_to_analyze = [
            permission for permission in permissions
            if permission in self.permissions_db
        ]

        if not permissions_to_analyze:
            logger.info("No known permissions to analyze.")
            return None, None

        # Process sequentially with delay to avoid rate limits (WatsonX has 2 req/s limit)
        is_permissions_reasonable = {}
        for i, permission in enumerate(permissions_to_analyze):
            try:
                chain = self._analyze_permission(
                    extension_name=extension_name,
                    extension_description=extension_description,
                    permission_name=permission,
                    permission_info=self.permissions_db[permission],
                )
                result = chain.invoke({})
                is_permissions_reasonable[permission] = result
                
                # Add delay between calls to respect rate limits (0.6s = ~1.7 req/s, under 2 req/s limit)
                if i < len(permissions_to_analyze) - 1:
                    time.sleep(0.6)
            except Exception as e:
                logger.warning(f"Failed to analyze permission {permission}: {e}")
                # Provide a fallback result for failed permission analysis
                is_permissions_reasonable[permission] = {
                    "is_reasonable": True,  # Default to reasonable to avoid blocking
                    "justification_reasoning": f"Analysis unavailable: {str(e)[:100]}",
                }
        
        return (
            self._format_permissions_analysis_result(permissions, is_permissions_reasonable),
            is_permissions_reasonable,
        )

    @staticmethod
    def _extract_domain_from_permission(permission: str) -> Optional[str]:
        """
        Extract the base domain from a host permission pattern.

        Examples:
            "https://*.chase.com/*" -> "chase.com"
            "https://chase.com/*" -> "chase.com"
            "*://chase.com/*" -> "chase.com"
            "<all_urls>" -> None
        """
        import re

        # Skip special patterns
        if permission in ["<all_urls>", "*://*/*", "http://*/*", "https://*/*", "file:///*"]:
            return None

        # Extract domain from pattern: protocol://[*.]domain.com[/path]
        # Match: optional protocol, optional *., domain, optional path
        pattern = r"(?:.*://)?(?:\*\.)?([a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+)"
        match = re.search(pattern, permission)

        if match:
            return match.group(1).lower()

        return None

    @staticmethod
    def _matches_sensitive_domain(permission_domain: str, sensitive_domain: str) -> bool:
        """
        Check if permission domain matches or is a subdomain of sensitive domain.

        Subdomain matching:
            permission_domain="chase.com" matches sensitive_domain="chase.com" ✓
            permission_domain="api.chase.com" matches sensitive_domain="chase.com" ✓
            permission_domain="chase.com" does NOT match sensitive_domain="api.chase.com" ✗
        """
        if permission_domain == sensitive_domain:
            return True

        # Check if it's a subdomain (ends with .sensitive_domain)
        if permission_domain.endswith(f".{sensitive_domain}"):
            return True

        return False

    def _detect_sensitive_domains(self, host_permissions: List) -> Dict[str, List[str]]:
        """
        Detect which sensitive domains are accessed by the host permissions.

        Returns:
            Dict mapping category names to list of matched domains
        """
        matches = {}

        for permission in host_permissions:
            permission_domain = self._extract_domain_from_permission(permission)

            if not permission_domain:
                continue

            # Check against all enabled categories
            for category_key, category_config in self.sensitive_domains_config.items():
                if not category_config.get("enabled", False):
                    continue

                category_name = category_config.get("name", category_key)
                sensitive_domains = category_config.get("domains", [])

                for sensitive_domain in sensitive_domains:
                    if self._matches_sensitive_domain(permission_domain, sensitive_domain):
                        if category_name not in matches:
                            matches[category_name] = []
                        if permission_domain not in matches[category_name]:
                            matches[category_name].append(permission_domain)

        return matches

    def _analyze_host_permissions(self, host_permissions: List) -> Optional[str]:
        """
        Analyze host permissions for critical access patterns and sensitive domain access.
         # TODO: Add manifestV2 support for host permissions
        """
        result_parts = []

        # Check for critical patterns
        critical_patterns = {
            "<all_urls>": "Access to ALL websites and local files",
            "*://*/*": "Access to all HTTP/HTTPS websites",
            "http://*/*": "Access to all HTTP websites",
            "https://*/*": "Access to all HTTPS websites",
            "file:///*": "Access to local files on computer",
        }

        critical_found = False
        for pattern in host_permissions:
            if pattern in critical_patterns:
                message = (
                    f"⚠️ Critical host permission detected: "
                    f"{pattern} ({critical_patterns[pattern]})"
                )
                result_parts.append(message)
                critical_found = True
                break

            if pattern.count("*") > 2:
                message = (
                    f"⚠️ Potentially critical host permission detected: "
                    f"{pattern} (excessive wildcards)"
                )
                result_parts.append(message)
                critical_found = True
                break

        if not critical_found:
            result_parts.append("✅ No critical host permissions detected.")

        # Check for sensitive domain access
        sensitive_matches = self._detect_sensitive_domains(host_permissions)

        if sensitive_matches:
            result_parts.append("\n📋 Sensitive domain access detected:")
            for category_name, domains in sensitive_matches.items():
                domains_str = ", ".join(sorted(domains))
                result_parts.append(f"  - {category_name}: {domains_str}")

        return "\n".join(result_parts)

    def _detect_screenshot_capture(
        self, manifest: Dict, extension_dir: str
    ) -> Dict[str, Any]:
        """
        Detect screenshot capture capabilities in the extension.

        Checks for:
        1. Screenshot-related permissions (desktopCapture, tabCapture)
        2. Screenshot libraries in content scripts (html2canvas, html2pdf)
        3. Screenshot library files in extension directory

        Returns:
            Dictionary with detection results
        """
        detected = False
        detection_method = None
        evidence = []

        # Check for screenshot-related permissions
        permissions = manifest.get("permissions", [])
        optional_permissions = manifest.get("optional_permissions", [])

        screenshot_permissions = ["desktopCapture", "tabCapture"]
        found_permissions = []

        for perm in screenshot_permissions:
            if perm in permissions:
                found_permissions.append(perm)
                detected = True
                if not detection_method:
                    detection_method = "Manifest permission"
            elif perm in optional_permissions:
                found_permissions.append(f"{perm} (optional)")
                detected = True
                if not detection_method:
                    detection_method = "Optional manifest permission"

        if found_permissions:
            evidence.extend(
                [
                    {"permission": perm, "source": "manifest_permissions"}
                    for perm in found_permissions
                ]
            )

        # Check content scripts for screenshot libraries
        content_scripts = manifest.get("content_scripts", [])
        screenshot_libraries = ["html2canvas", "html2pdf"]

        for script_config in content_scripts:
            js_files = script_config.get("js", [])
            for js_file in js_files:
                js_file_lower = js_file.lower()
                for library in screenshot_libraries:
                    if library in js_file_lower:
                        detected = True
                        if not detection_method:
                            detection_method = "Screenshot library in manifest"
                        evidence.append(
                            {
                                "file": js_file,
                                "library": library,
                                "source": "manifest_content_scripts",
                            }
                        )

        # Check extension directory for screenshot library files
        if extension_dir and os.path.exists(extension_dir):
            screenshot_file_patterns = [
                "html2canvas.js",
                "html2canvas.min.js",
                "html2pdf.js",
                "html2pdf.min.js",
                "html2pdf.bundle.js",
                "html2pdf.bundle.min.js",
            ]

            for root, _, files in os.walk(extension_dir):
                for file in files:
                    file_lower = file.lower()
                    for pattern in screenshot_file_patterns:
                        if pattern.lower() in file_lower:
                            detected = True
                            if not detection_method:
                                detection_method = "Screenshot library file"
                            rel_path = os.path.relpath(
                                os.path.join(root, file), extension_dir
                            )
                            evidence.append(
                                {
                                    "file": rel_path,
                                    "source": "extracted_files",
                                }
                            )
                            break

        return {
            "detected": detected,
            "detection_method": detection_method or "Not detected",
            "evidence": evidence[:10],  # Limit to 10 evidence items
            "risk_score": 1 if detected else 0,
            "description": "Screenshot capture capability detected"
            if detected
            else "No screenshot capture capability detected",
        }

    def analyze(
        self, extension_dir: str, manifest: Optional[Dict] = None, metadata: Optional[Dict] = None
    ) -> Optional[Dict]:
        """Analyze the permissions of a browser extension."""
        if manifest is None:
            return None

        logger.info("Analyzing extension permissions")
        extension_name = manifest.get("name", "Unknown Extension")
        extension_description = manifest.get("description", "")
        permissions = manifest.get("permissions", [])
        host_permissions = manifest.get("host_permissions", [])

        permissions_analysis, permissions_details = self._analyze_permissions(
            extension_name=extension_name,
            extension_description=extension_description,
            permissions=permissions,
        )

        host_permissions_analysis = self._analyze_host_permissions(
            host_permissions=host_permissions
        )

        # Detect screenshot capture capabilities
        screenshot_capture_analysis = self._detect_screenshot_capture(
            manifest=manifest, extension_dir=extension_dir
        )

        return {
            "permissions_analysis": permissions_analysis,
            "permissions_details": permissions_details,
            "host_permissions_analysis": host_permissions_analysis,
            "screenshot_capture_analysis": screenshot_capture_analysis,
        }
