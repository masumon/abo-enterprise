"""The start-up guard must add only what is missing, never run DDL otherwise, and never
stop the API from starting."""
import pytest

from app.core.schema_guard import (
    ADMIN_SECURITY_COLUMNS,
    ensure_admin_security_columns,
    missing_admin_security_statements,
)

ALL = set(ADMIN_SECURITY_COLUMNS)
BASE = {"id", "email", "password_hash", "totp_secret", "totp_enabled"}


def test_nothing_to_do_when_all_columns_exist():
    assert missing_admin_security_statements(BASE | ALL) == []


def test_every_missing_column_gets_an_idempotent_additive_statement():
    stmts = missing_admin_security_statements(BASE)
    assert len(stmts) == len(ALL)
    for s in stmts:
        assert s.startswith("ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS ")
        assert "DROP" not in s.upper() and "UPDATE" not in s.upper()
    assert any("token_version INTEGER NOT NULL DEFAULT 0" in s for s in stmts)


def test_only_the_absent_columns_are_added():
    stmts = missing_admin_security_statements(BASE | {"totp_recovery_codes", "token_version"})
    joined = " ".join(stmts)
    assert "totp_recovery_codes" not in joined and "token_version" not in joined
    assert "totp_last_step" in joined and "locked_until" in joined


# ------------------------------------------------------------------ fake engine
class _Rows(list):
    pass


class _Conn:
    def __init__(self, existing, log):
        self._existing, self._log = existing, log

    async def execute(self, statement, *a, **k):
        sql = str(statement)
        self._log.append(sql)
        if "information_schema" in sql:
            return _Rows((c,) for c in self._existing)
        return _Rows()


class _Begin:
    def __init__(self, conn):
        self._conn = conn

    async def __aenter__(self):
        return self._conn

    async def __aexit__(self, *exc):
        return False


class _Engine:
    def __init__(self, existing, dialect="postgresql", boom=False):
        self.dialect = type("D", (), {"name": dialect})()
        self.log: list[str] = []
        self._existing, self._boom = existing, boom

    def begin(self):
        if self._boom:
            raise RuntimeError("database unreachable")
        return _Begin(_Conn(self._existing, self.log))


@pytest.mark.asyncio
async def test_no_ddl_runs_when_schema_is_complete():
    engine = _Engine(BASE | ALL)
    assert await ensure_admin_security_columns(engine) == []
    assert not any(s.startswith("ALTER") for s in engine.log)


@pytest.mark.asyncio
async def test_missing_columns_are_added_once():
    engine = _Engine(BASE)
    ran = await ensure_admin_security_columns(engine)
    assert len(ran) == len(ALL)
    assert sum(s.startswith("ALTER") for s in engine.log) == len(ALL)


@pytest.mark.asyncio
async def test_unknown_or_missing_table_is_left_alone():
    engine = _Engine(set())
    assert await ensure_admin_security_columns(engine) == []
    assert not any(s.startswith("ALTER") for s in engine.log)


@pytest.mark.asyncio
async def test_non_postgres_databases_are_skipped():
    engine = _Engine(BASE, dialect="sqlite")
    assert await ensure_admin_security_columns(engine) == []
    assert engine.log == []


@pytest.mark.asyncio
async def test_a_database_error_never_blocks_startup():
    assert await ensure_admin_security_columns(_Engine(BASE, boom=True)) == []
