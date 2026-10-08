"""Apon APK download: captcha, tickets and source allow-list."""
import re

from app.core import app_download as ad


def _solve(c: dict) -> int:
    return c["a"] + c["b"] if c["op"] == "+" else c["a"] - c["b"]


def test_captcha_questions_are_small_and_never_negative():
    for level in ("easy", "medium"):
        for _ in range(200):
            c = ad.make_captcha(level)
            assert c["op"] in "+-" and _solve(c) >= 0
            assert c["a"] <= 40 and c["b"] <= 9
            assert "answer" not in c


def test_correct_answer_passes_once_and_only_once():
    c = ad.make_captcha()
    assert ad.verify_captcha(c["token"], str(_solve(c)))
    assert not ad.verify_captcha(c["token"], str(_solve(c)))  # a token is single-use


def test_wrong_empty_and_garbage_answers_fail_without_burning_the_token():
    c = ad.make_captcha()
    right = _solve(c)
    assert not ad.verify_captcha(c["token"], str(right + 1))
    assert not ad.verify_captcha(c["token"], "")
    assert not ad.verify_captcha(c["token"], "abc")
    assert not ad.verify_captcha("junk", "1")
    assert ad.verify_captcha(c["token"], str(right))  # still usable after wrong guesses


def test_bengali_digits_and_spaces_are_accepted():
    c = ad.make_captcha()
    bn = str(_solve(c)).translate(str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯"))
    assert ad.verify_captcha(c["token"], f" {bn} ")


def test_expired_captcha_is_rejected():
    c = ad.make_captcha(now=1_000)
    assert not ad.verify_captcha(c["token"], str(_solve(c)), now=1_000 + ad.CAPTCHA_TTL_SECONDS + 1)


def test_tampered_token_fails():
    c = ad.make_captcha()
    nonce, exp, sig = c["token"].split(".")
    assert not ad.verify_captcha(f"{nonce}.{int(exp) + 999}.{sig}", str(_solve(c)))


def test_ticket_roundtrip_expiry_and_use_limit():
    t = ad.make_ticket("rel-1", now=5_000)
    assert ad.verify_ticket(t, now=5_001) == "rel-1"
    for _ in range(ad.TICKET_MAX_REQUESTS - 1):
        assert ad.verify_ticket(t, now=5_002) == "rel-1"
    assert ad.verify_ticket(t, now=5_003) is None  # used up
    expired = ad.make_ticket("rel-2", now=5_000)
    assert ad.verify_ticket(expired, now=5_000 + ad.TICKET_TTL_SECONDS + 1) is None
    assert ad.verify_ticket("a.b.c.d") is None and ad.verify_ticket("") is None


def test_ticket_cannot_be_retargeted_to_another_release():
    t = ad.make_ticket("rel-A", now=9_000)
    nonce, exp, _rid, sig = t.split(".")
    assert ad.verify_ticket(f"{nonce}.{exp}.rel-B.{sig}", now=9_001) is None


def test_source_allow_list_accepts_github_and_blocks_everything_else():
    ok = [
        "https://github.com/masumon/abo-enterprise/releases/download/apon-v1.0.0/Apon-1.0.0.apk",
        "https://objects.githubusercontent.com/x/y?z=1",
        "https://abc.supabase.co/storage/v1/object/sign/apk/Apon.apk",
    ]
    bad = [
        "http://github.com/a/b.apk",                  # not https
        "https://evil.example.com/a.apk",
        "https://github.com.evil.example.com/a.apk",  # look-alike host
        "https://user:pw@github.com/a.apk",           # credentials
        "https://github.com:8443/a.apk",              # odd port
        "https://127.0.0.1/a.apk",
        "https://169.254.169.254/latest/meta-data",   # cloud metadata
        "file:///etc/passwd",
        "",
    ]
    assert all(ad.is_allowed_source_url(u) for u in ok)
    assert not any(ad.is_allowed_source_url(u) for u in bad)


def test_ip_hash_is_stable_and_not_the_ip():
    h = ad.hash_ip("203.0.113.9")
    assert h == ad.hash_ip("203.0.113.9") and "203.0.113.9" not in h and re.fullmatch(r"[0-9a-f]{64}", h)
    assert h != ad.hash_ip("203.0.113.10")


def test_filenames_are_sanitised():
    assert ad.safe_filename("Apon-1.0.0.apk") == "Apon-1.0.0.apk"
    assert ad.safe_filename("../../etc/passwd") == "etcpasswd.apk"
    assert ad.safe_filename("") == "Apon.apk"
    assert ad.safe_filename("a b\r\nc.apk") == "abc.apk"
