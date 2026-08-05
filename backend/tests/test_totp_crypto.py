"""Coverage for core/totp_crypto.py — the P1 fix that stopped storing
AdminUser.totp_secret in plaintext. No database involved: this only
exercises the encrypt/decrypt round-trip and the legacy-plaintext
fallback that keeps pre-existing secrets (written before this module
existed) working without a data migration.
"""
import pyotp

from app.core.totp_crypto import decrypt_totp_secret, encrypt_totp_secret


def test_round_trip_recovers_original_secret():
    secret = pyotp.random_base32()
    encrypted = encrypt_totp_secret(secret)
    assert decrypt_totp_secret(encrypted) == secret


def test_encrypted_value_is_not_the_plaintext_secret():
    secret = "JBSWY3DPEHPK3PXP"
    encrypted = encrypt_totp_secret(secret)
    assert encrypted != secret
    assert secret not in encrypted


def test_legacy_plaintext_secret_still_decrypts_to_itself():
    """A secret written before this module existed is a raw base32 string,
    not a Fernet token — decrypt_totp_secret must return it unchanged
    rather than raising, so existing 2FA logins keep working."""
    legacy_secret = "JBSWY3DPEHPK3PXP"
    assert decrypt_totp_secret(legacy_secret) == legacy_secret


def test_encrypted_secret_still_produces_valid_totp_codes():
    """End-to-end sanity check: encrypt a secret, decrypt it, and confirm
    pyotp can still generate/verify codes against the recovered secret —
    the actual login-flow use case in auth.py."""
    secret = pyotp.random_base32()
    stored = encrypt_totp_secret(secret)
    recovered = decrypt_totp_secret(stored)
    code = pyotp.TOTP(secret).now()
    assert pyotp.TOTP(recovered).verify(code, valid_window=1)


def test_two_encryptions_of_same_secret_differ():
    # Fernet includes a random IV/timestamp per call — ciphertext should not
    # be deterministic (a stronger property than strictly required, but a
    # regression here would indicate a broken/no-op encryption).
    secret = "JBSWY3DPEHPK3PXP"
    assert encrypt_totp_secret(secret) != encrypt_totp_secret(secret)
