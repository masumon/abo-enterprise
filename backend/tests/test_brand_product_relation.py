from pathlib import Path
import re


def test_brand_product_relation_migrations_are_additive():
    manual = Path("manual_sql/0033_brand_product_relation.sql")
    alembic = Path("alembic/versions/0033_brand_product_relation.py")
    assert manual.exists()
    assert alembic.exists()

    sql = manual.read_text()
    assert "ADD COLUMN IF NOT EXISTS brand_id UUID" in sql
    assert "fk_products_brand_id" in sql
    assert "REFERENCES brands(id) ON DELETE SET NULL" in sql
    assert "trg_products_brand_master" in sql
    statements = [line.strip() for line in sql.splitlines() if not line.strip().startswith("--")]
    executable_sql = "\n".join(statements)
    assert not re.search(r"\b(DROP|TRUNCATE)\b|\bDELETE\s+(FROM|TABLE)\b", executable_sql, re.IGNORECASE)

    migration = alembic.read_text()
    assert 'revision: str = "0033"' in migration
    assert 'down_revision: str | None = "0032"' in migration
    assert "ADD COLUMN IF NOT EXISTS brand_id UUID" in migration
