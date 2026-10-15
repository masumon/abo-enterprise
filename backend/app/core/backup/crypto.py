"""Encrypted backup file format (``.abobak``).

Design goals:
  * The server only holds the PUBLIC key, so a stolen server/database cannot
    decrypt old backups.
  * Every file is self-contained: its header carries the private key sealed
    with the owner's passphrase (scrypt), so restoring needs only the file and
    the passphrase — even when the live database (and its settings) is gone.
  * Tamper/truncation evident: AES-256-GCM per 1 MiB chunk, the header hash,
    chunk index and a "final" flag are bound into every chunk's AAD.

Layout::

    b"ABOBAK1\\n" | u32 header_len | header JSON | chunks…
    chunk = u32 len | AES-GCM(ciphertext+tag)

Key wrapping: data key (random 32 B) is encrypted with a KEK derived by
HKDF-SHA256 from X25519(ephemeral, recipient public key).
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import struct
from dataclasses import dataclass
from typing import BinaryIO

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

MAGIC = b"ABOBAK1\n"
CHUNK = 1024 * 1024
MIN_PASSPHRASE = 12
_SCRYPT = {"n": 2 ** 17, "r": 8, "p": 1}
_INFO = b"abo-backup-v1"


class BackupCryptoError(Exception):
    """Wrong passphrase, damaged or tampered file."""


def _b64(b: bytes) -> str:
    return base64.b64encode(b).decode("ascii")


def _unb64(s: str) -> bytes:
    return base64.b64decode(s.encode("ascii"))


def _raw_pub(pub: X25519PublicKey) -> bytes:
    return pub.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)


def fingerprint(public_b64: str) -> str:
    """Short, human-checkable id of a key (shown in the admin and the kit)."""
    h = hashlib.sha256(_unb64(public_b64)).hexdigest()[:16].upper()
    return "-".join(h[i:i + 4] for i in range(0, 16, 4))


def _scrypt_key(passphrase: str, salt: bytes, params: dict) -> bytes:
    return Scrypt(salt=salt, length=32, n=params["n"], r=params["r"], p=params["p"]).derive(passphrase.encode("utf-8"))


@dataclass
class KeyBundle:
    public_b64: str
    sealed_private: dict  # passphrase-sealed private key (safe to store anywhere)

    @property
    def fingerprint(self) -> str:
        return fingerprint(self.public_b64)


def generate_keys(passphrase: str) -> KeyBundle:
    if len(passphrase or "") < MIN_PASSPHRASE:
        raise BackupCryptoError(f"passphrase must be at least {MIN_PASSPHRASE} characters")
    priv = X25519PrivateKey.generate()
    raw_priv = priv.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw,
                                  serialization.NoEncryption())
    salt, nonce = os.urandom(16), os.urandom(12)
    sealed = AESGCM(_scrypt_key(passphrase, salt, _SCRYPT)).encrypt(nonce, raw_priv, b"abo-backup-key")
    return KeyBundle(
        public_b64=_b64(_raw_pub(priv.public_key())),
        sealed_private={"kdf": "scrypt", **_SCRYPT, "salt": _b64(salt), "nonce": _b64(nonce), "ct": _b64(sealed)},
    )


def unseal_private(sealed: dict, passphrase: str) -> X25519PrivateKey:
    try:
        key = _scrypt_key(passphrase, _unb64(sealed["salt"]), sealed)
        raw = AESGCM(key).decrypt(_unb64(sealed["nonce"]), _unb64(sealed["ct"]), b"abo-backup-key")
    except (InvalidTag, KeyError, ValueError) as exc:
        raise BackupCryptoError("wrong passphrase") from exc
    return X25519PrivateKey.from_private_bytes(raw)


def check_passphrase(bundle: KeyBundle, passphrase: str) -> bool:
    try:
        priv = unseal_private(bundle.sealed_private, passphrase)
    except BackupCryptoError:
        return False
    return _b64(_raw_pub(priv.public_key())) == bundle.public_b64


def _kek(shared: bytes, epk: bytes, rpk: bytes) -> bytes:
    return HKDF(algorithm=hashes.SHA256(), length=32, salt=epk + rpk, info=_INFO).derive(shared)


def _nonce(base: bytes, idx: int) -> bytes:
    n = int.from_bytes(base, "big") ^ idx
    return n.to_bytes(12, "big")


def _aad(header_hash: bytes, idx: int, final: bool) -> bytes:
    return header_hash + struct.pack(">QB", idx, 1 if final else 0)


def encrypt_stream(src: BinaryIO, dst: BinaryIO, bundle: KeyBundle, meta: dict | None = None) -> None:
    """Encrypt ``src`` into ``dst`` for the bundle's public key."""
    rpk = _unb64(bundle.public_b64)
    eph = X25519PrivateKey.generate()
    epk = _raw_pub(eph.public_key())
    kek = _kek(eph.exchange(X25519PublicKey.from_public_bytes(rpk)), epk, rpk)
    data_key, wrap_nonce, base_nonce = os.urandom(32), os.urandom(12), os.urandom(12)
    header = {
        "v": 1,
        "alg": "X25519-HKDF-SHA256+AES-256-GCM",
        "kid": bundle.fingerprint,
        "epk": _b64(epk),
        "wrap_nonce": _b64(wrap_nonce),
        "wrapped_key": _b64(AESGCM(kek).encrypt(wrap_nonce, data_key, _INFO)),
        "base_nonce": _b64(base_nonce),
        "chunk": CHUNK,
        "sealed_private": bundle.sealed_private,
        "meta": meta or {},
    }
    hbytes = json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8")
    hhash = hashlib.sha256(hbytes).digest()
    dst.write(MAGIC + struct.pack(">I", len(hbytes)) + hbytes)
    aes = AESGCM(data_key)
    idx = 0
    cur = src.read(CHUNK)
    while True:
        nxt = src.read(CHUNK) if cur else b""
        final = not nxt
        ct = aes.encrypt(_nonce(base_nonce, idx), cur, _aad(hhash, idx, final))
        dst.write(struct.pack(">I", len(ct)) + ct)
        if final:
            break
        cur, idx = nxt, idx + 1


def read_header(src: BinaryIO) -> tuple[dict, bytes]:
    if src.read(len(MAGIC)) != MAGIC:
        raise BackupCryptoError("not an ABO backup file")
    raw_len = src.read(4)
    if len(raw_len) != 4:
        raise BackupCryptoError("file is truncated")
    (hlen,) = struct.unpack(">I", raw_len)
    if hlen > 1_000_000:
        raise BackupCryptoError("damaged header")
    hbytes = src.read(hlen)
    try:
        header = json.loads(hbytes)
    except ValueError as exc:
        raise BackupCryptoError("damaged header") from exc
    return header, hashlib.sha256(hbytes).digest()


def decrypt_stream(src: BinaryIO, dst: BinaryIO, passphrase: str) -> dict:
    """Decrypt into ``dst``; returns the header meta. Raises on any tampering."""
    header, hhash = read_header(src)
    priv = unseal_private(header["sealed_private"], passphrase)
    epk, rpk = _unb64(header["epk"]), _raw_pub(priv.public_key())
    try:
        data_key = AESGCM(_kek(priv.exchange(X25519PublicKey.from_public_bytes(epk)), epk, rpk)).decrypt(
            _unb64(header["wrap_nonce"]), _unb64(header["wrapped_key"]), _INFO)
    except InvalidTag as exc:
        raise BackupCryptoError("key does not match this file") from exc
    aes, base_nonce = AESGCM(data_key), _unb64(header["base_nonce"])
    idx = 0
    while True:
        raw_len = src.read(4)
        if len(raw_len) != 4:
            raise BackupCryptoError("file is truncated")
        (clen,) = struct.unpack(">I", raw_len)
        ct = src.read(clen)
        if len(ct) != clen:
            raise BackupCryptoError("file is truncated")
        final = src.peek(1)[:1] == b"" if hasattr(src, "peek") else _at_eof(src)
        try:
            dst.write(aes.decrypt(_nonce(base_nonce, idx), ct, _aad(hhash, idx, final)))
        except InvalidTag as exc:
            raise BackupCryptoError("file is damaged or was changed") from exc
        if final:
            return header.get("meta", {})
        idx += 1


def _at_eof(src: BinaryIO) -> bool:
    pos = src.tell()
    more = src.read(1)
    src.seek(pos)
    return more == b""
