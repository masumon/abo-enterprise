import pytest
from app.api.v1.routes import reports as rp


@pytest.mark.asyncio
async def test_report_pdf_is_a_pdf(monkeypatch):
    async def fake(db, start, end):
        return [{"date": "2026-10-01", "orders": 3, "revenue": 1234.5, "note": "বাংলা"}, {"date": "2026-10-02", "orders": 0, "revenue": None}]
    monkeypatch.setitem(rp.REPORT_BUILDERS, "sales", fake)
    r = await rp.export_report_pdf("sales", None, None, db=None, _admin="a")
    body = b"".join([c async for c in r.body_iterator])
    assert body[:4] == b"%PDF" and r.headers["content-disposition"].endswith(".pdf")
