"""Unit tests for the security scanner."""

from libs.security.scanner import SecurityScanner, Severity


class TestSecurityScanner:
    def setup_method(self):
        self.scanner = SecurityScanner()

    def test_detect_hardcoded_secret(self):
        code = 'password = "super_secret_password_123"'
        findings = self.scanner.scan_code(code)
        assert len(findings) >= 1
        assert any(f.rule_id == "SEC001" for f in findings)
        assert any(f.severity == Severity.CRITICAL for f in findings)

    def test_detect_sql_injection(self):
        code = 'cursor.execute("SELECT * FROM users WHERE id = %s" % user_id)'
        findings = self.scanner.scan_code(code)
        assert any(f.rule_id == "SEC002" for f in findings)

    def test_detect_command_injection(self):
        code = 'os.system("rm -rf " + user_input)'
        findings = self.scanner.scan_code(code)
        assert any(f.rule_id == "SEC003" for f in findings)

    def test_detect_debug_mode(self):
        code = "DEBUG = True"
        findings = self.scanner.scan_code(code)
        assert any(f.rule_id == "SEC004" for f in findings)

    def test_clean_code_passes(self):
        code = '''
import os

def get_config():
    return os.environ.get("DATABASE_URL", "")
'''
        assert self.scanner.is_safe(code)

    def test_detect_insecure_http(self):
        code = 'url = "http://external-api.com/data"'
        findings = self.scanner.scan_code(code)
        assert any(f.rule_id == "SEC005" for f in findings)

    def test_localhost_http_is_ok(self):
        code = 'url = "http://localhost:8000/health"'
        findings = self.scanner.scan_code(code)
        assert not any(f.rule_id == "SEC005" for f in findings)
