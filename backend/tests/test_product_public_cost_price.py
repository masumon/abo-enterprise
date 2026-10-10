"""cost_price is the admin's purchase cost — it must never be serialized by
public (customer-facing) product endpoints, while admin output keeps it."""
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.schemas.schemas import ProductOut, ProductPublicOut

ROUTES = Path(__file__).resolve().parents[1] / "app" / "api" / "v1" / "routes"


def _product(**extra):
    base = dict(
        id=uuid.uuid4(), created_at=datetime.now(timezone.utc), slug="usb-c-cable",
        name_en="USB-C Cable", name_bn="ইউএসবি-সি ক্যাবল", price=350.0, cost_price=210.0,
        category="accessories",
    )
    base.update(extra)
    return base


def test_public_product_output_hides_cost_price():
    data = ProductPublicOut.model_validate(_product()).model_dump(mode="json")
    assert "cost_price" not in data
    assert data["price"] == 350.0


def test_admin_product_output_keeps_cost_price():
    data = ProductOut.model_validate(_product()).model_dump(mode="json")
    assert data["cost_price"] == 210.0


def _fn_body(src: str, name: str) -> str:
    match = re.search(r"async def " + name + r"\(.*?(?=\n@router|\Z)", src, re.S)
    assert match, name
    return match.group(0)

# Route-level coverage lives in the bulk-import/public-serializer tests (other implementation kept).
