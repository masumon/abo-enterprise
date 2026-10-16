"""Customer profile photo: only the signed-in customer, only real image bytes."""
from fastapi.testclient import TestClient

from app.api.v1.routes.customer_profile import _is_real_image
from app.core.security import create_customer_token
from app.main import app


def test_real_image_sniffing():
    assert _is_real_image(bytes((0xFF, 0xD8, 0xFF, 0xE0)))
    assert _is_real_image(bytes((0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)))
    assert _is_real_image(b"RIFF\x00\x00\x00\x00WEBPVP8 ")
    assert not _is_real_image(b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>')
    assert not _is_real_image(b"<html><script>x</script>")


def test_avatar_requires_customer_login():
    c = TestClient(app)
    assert c.get("/api/v1/customer/avatar").status_code == 401
    assert c.delete("/api/v1/customer/avatar").status_code == 401
    r = c.post("/api/v1/customer/avatar", files={"file": ("a.jpg", b"\xff\xd8\xff", "image/jpeg")})
    assert r.status_code == 401


def test_avatar_rejects_disguised_file():
    token = create_customer_token("01700000000")
    r = TestClient(app).post(
        "/api/v1/customer/avatar",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("evil.jpg", b"<svg onload=alert(1)>", "image/jpeg")},
    )
    assert r.status_code == 400
