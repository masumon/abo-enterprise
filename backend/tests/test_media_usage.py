"""Where-used scan finds a file by Cloudinary public_id or URL."""
import asyncio
import json

from app.core import media_usage as mu


def test_usage_finds_public_id_and_skips_deleted(monkeypatch):
    rows = [
        ("products", json.dumps({"id": "p1", "name_bn": "চার্জার", "image_url": "https://res.cloudinary.com/x/image/upload/c_fill,w_300/v1/abo/products/file_abc.jpg"})),
        ("products", json.dumps({"id": "p2", "name_bn": "পুরনো", "is_deleted": True, "image_url": "…/abo/products/file_abc.jpg"})),
        ("site_settings", json.dumps({"id": "s1", "key": "hero_image", "value": "https://res.cloudinary.com/x/image/upload/v1/abo/hero.jpg"})),
    ]

    async def fake_rows(db):
        return rows
    monkeypatch.setattr(mu, "_rows", fake_rows)
    out = asyncio.run(mu.usage_for(None, [
        ("a1", "https://res.cloudinary.com/x/image/upload/v1/abo/products/file_abc.jpg", "abo/products/file_abc"),
        ("a2", "https://res.cloudinary.com/x/image/upload/v1/abo/hero.jpg", None),
        ("a3", "https://res.cloudinary.com/x/image/upload/v1/abo/unused.jpg", "abo/unused"),
    ]))
    assert [h["id"] for h in out["a1"]] == ["p1"]
    assert out["a1"][0]["admin_url"] == "/sumon/products?edit=p1" and out["a1"][0]["kind"] == "পণ্য"
    assert out["a2"][0]["name"] == "hero_image"
    assert out["a3"] == []
