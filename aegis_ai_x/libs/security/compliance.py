"""Compliance checking for enterprise requirements."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class ComplianceStandard(str, Enum):
    SOC2 = "soc2"
    GDPR = "gdpr"
    HIPAA = "hipaa"
    PCI_DSS = "pci_dss"


class ComplianceStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"
    NOT_APPLICABLE = "n/a"


@dataclass
class ComplianceResult:
    check_id: str
    standard: ComplianceStandard
    title: str
    status: ComplianceStatus
    details: str = ""
    remediation: str = ""


@dataclass
class ComplianceReport:
    results: list[ComplianceResult] = field(default_factory=list)

    @property
    def passed(self) -> int:
        return sum(1 for r in self.results if r.status == ComplianceStatus.PASS)

    @property
    def failed(self) -> int:
        return sum(1 for r in self.results if r.status == ComplianceStatus.FAIL)

    @property
    def warnings(self) -> int:
        return sum(1 for r in self.results if r.status == ComplianceStatus.WARNING)

    @property
    def score(self) -> float:
        applicable = [r for r in self.results if r.status != ComplianceStatus.NOT_APPLICABLE]
        if not applicable:
            return 100.0
        return (self.passed / len(applicable)) * 100


class ComplianceChecker:
    """Checks system configuration against compliance standards."""

    def check_data_encryption(self, config: dict[str, Any]) -> ComplianceResult:
        """Check if data encryption is properly configured."""
        has_tls = config.get("tls_enabled", False)
        has_encryption_at_rest = config.get("encryption_at_rest", False)

        if has_tls and has_encryption_at_rest:
            status = ComplianceStatus.PASS
            details = "TLS and encryption at rest are both enabled."
        elif has_tls:
            status = ComplianceStatus.WARNING
            details = "TLS enabled but encryption at rest is missing."
        else:
            status = ComplianceStatus.FAIL
            details = "Data encryption is not properly configured."

        return ComplianceResult(
            check_id="ENC001",
            standard=ComplianceStandard.SOC2,
            title="Data Encryption",
            status=status,
            details=details,
            remediation="Enable TLS for transit and encryption at rest for storage.",
        )

    def check_access_control(self, config: dict[str, Any]) -> ComplianceResult:
        """Check if access controls are properly configured."""
        has_rbac = config.get("rbac_enabled", False)
        has_mfa = config.get("mfa_enabled", False)

        if has_rbac and has_mfa:
            status = ComplianceStatus.PASS
            details = "RBAC and MFA are both enabled."
        elif has_rbac:
            status = ComplianceStatus.WARNING
            details = "RBAC enabled but MFA is not configured."
        else:
            status = ComplianceStatus.FAIL
            details = "Access control is not properly configured."

        return ComplianceResult(
            check_id="ACC001",
            standard=ComplianceStandard.SOC2,
            title="Access Control",
            status=status,
            details=details,
            remediation="Enable RBAC and MFA for all user accounts.",
        )

    def check_audit_logging(self, config: dict[str, Any]) -> ComplianceResult:
        """Check if audit logging is configured."""
        has_logging = config.get("audit_logging", False)
        retention_days = config.get("log_retention_days", 0)

        if has_logging and retention_days >= 90:
            status = ComplianceStatus.PASS
            details = f"Audit logging enabled with {retention_days} day retention."
        elif has_logging:
            status = ComplianceStatus.WARNING
            details = f"Audit logging enabled but retention ({retention_days}d) is below 90 days."
        else:
            status = ComplianceStatus.FAIL
            details = "Audit logging is not enabled."

        return ComplianceResult(
            check_id="AUD001",
            standard=ComplianceStandard.SOC2,
            title="Audit Logging",
            status=status,
            details=details,
            remediation="Enable audit logging with at least 90 days retention.",
        )

    def run_audit(self, config: dict[str, Any]) -> ComplianceReport:
        """Run all compliance checks and return a report."""
        report = ComplianceReport()
        report.results.append(self.check_data_encryption(config))
        report.results.append(self.check_access_control(config))
        report.results.append(self.check_audit_logging(config))
        return report
