"""Security scanning for generated code and configurations."""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


@dataclass
class SecurityFinding:
    rule_id: str
    severity: Severity
    title: str
    description: str
    location: str
    line_number: int | None = None
    suggestion: str = ""


class SecurityScanner:
    """Scans code and configurations for security vulnerabilities."""

    # Patterns to detect common security issues
    RULES = [
        {
            "id": "SEC001",
            "severity": Severity.CRITICAL,
            "title": "Hardcoded secret detected",
            "pattern": r"""(?i)(password|secret|api_key|token)\s*=\s*['"][^'"]{8,}['"]""",
            "description": "Hardcoded credentials found in source code.",
            "suggestion": "Use environment variables or a secrets manager.",
        },
        {
            "id": "SEC002",
            "severity": Severity.HIGH,
            "title": "SQL injection risk",
            "pattern": r"""(?i)(execute|raw|query)\s*\([^)]*(%s|{|\+)""",
            "description": "Potential SQL injection via string formatting.",
            "suggestion": "Use parameterized queries.",
        },
        {
            "id": "SEC003",
            "severity": Severity.HIGH,
            "title": "Command injection risk",
            "pattern": r"""(?i)(os\.system|subprocess\.call|subprocess\.run)\s*\([^)]*(\+|format|%)""",
            "description": "Potential command injection via string interpolation.",
            "suggestion": "Use subprocess with list arguments, avoid shell=True.",
        },
        {
            "id": "SEC004",
            "severity": Severity.MEDIUM,
            "title": "Debug mode enabled",
            "pattern": r"""(?i)debug\s*=\s*True""",
            "description": "Debug mode should not be enabled in production.",
            "suggestion": "Use environment-based configuration.",
        },
        {
            "id": "SEC005",
            "severity": Severity.MEDIUM,
            "title": "Insecure HTTP URL",
            "pattern": r"""http://(?!localhost|127\.0\.0\.1|0\.0\.0\.0)""",
            "description": "Non-localhost HTTP URL found, should use HTTPS.",
            "suggestion": "Use HTTPS for external URLs.",
        },
        {
            "id": "SEC006",
            "severity": Severity.HIGH,
            "title": "Unsafe deserialization",
            "pattern": r"""(?i)(pickle\.loads?|yaml\.load\s*\([^)]*(?!Loader))""",
            "description": "Unsafe deserialization can lead to remote code execution.",
            "suggestion": "Use safe deserialization methods (yaml.safe_load, json).",
        },
    ]

    def scan_code(self, code: str, filename: str = "<unknown>") -> list[SecurityFinding]:
        """Scan a code string for security issues."""
        findings: list[SecurityFinding] = []
        lines = code.split("\n")

        for rule in self.RULES:
            pattern = re.compile(rule["pattern"])
            for i, line in enumerate(lines, start=1):
                if pattern.search(line):
                    findings.append(
                        SecurityFinding(
                            rule_id=rule["id"],
                            severity=rule["severity"],
                            title=rule["title"],
                            description=rule["description"],
                            location=filename,
                            line_number=i,
                            suggestion=rule["suggestion"],
                        )
                    )

        return findings

    def scan_file(self, filepath: str) -> list[SecurityFinding]:
        """Scan a file for security issues."""
        with open(filepath) as f:
            content = f.read()
        return self.scan_code(content, filename=filepath)

    def is_safe(self, code: str) -> bool:
        """Quick check if code has no high/critical findings."""
        findings = self.scan_code(code)
        return not any(
            f.severity in (Severity.CRITICAL, Severity.HIGH)
            for f in findings
        )
