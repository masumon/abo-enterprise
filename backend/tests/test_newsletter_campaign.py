"""Newsletter campaign e-mail: safe HTML, working links, signed unsubscribe link."""
from app.api.v1.routes import newsletter as nl


def test_body_to_html_escapes_and_links():
    out = nl.body_to_html("<script>x</script> **অফার** [দেখুন](https://aboenterprise.com/x)\nhttps://a.com/b :phone:")
    assert "<script>" not in out and "&lt;script&gt;" in out
    assert "<strong>অফার</strong>" in out
    assert '<a href="https://aboenterprise.com/x">দেখুন</a>' in out
    assert '<a href="https://a.com/b">https://a.com/b</a>' in out
    assert "<br>" in out and ":phone:" not in out


def test_unsubscribe_token_is_per_email():
    t1 = nl.unsubscribe_token("A@x.com")
    assert t1 == nl.unsubscribe_token("a@x.com") and t1 != nl.unsubscribe_token("b@x.com")
    html = nl.campaign_html("হ্যালো", "a@x.com")
    assert f"t={t1}" in html and "/api/v1/public/newsletter/unsubscribe" in html
