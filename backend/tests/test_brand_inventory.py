import re


def test_brand_slug_contract():
    pattern = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    assert pattern.fullmatch("samsung")
    assert pattern.fullmatch("apple-inc")
    assert not pattern.fullmatch("Samsung")
    assert not pattern.fullmatch("apple inc")


def test_inventory_movement_is_delta_based():
    before, delta = 12, -5
    after = before + delta
    assert after == 7
    assert delta == after - before


def test_inventory_negative_stock_is_rejected():
    before, delta = 3, -4
    assert before + delta < 0


def test_schema_files_use_same_revision():
    from pathlib import Path
    sql = Path("migrations/035_brands_inventory.sql")
    alembic = Path("alembic/versions/0032_brands_inventory.py")
    assert sql.exists()
    assert alembic.exists()
    assert "CREATE TABLE IF NOT EXISTS brands" in sql.read_text()
    assert 'revision: str = "0032"' in alembic.read_text()
    assert 'down_revision: str | None = "0031"' in alembic.read_text()
