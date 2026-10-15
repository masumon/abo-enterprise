"""Decrypt an ABO ``.abobak`` backup into a normal PostgreSQL ``.dump`` file.

Works offline on any PC — needs only the file and the Backup password
(no server, no database, no internet). Nothing is restored automatically.

    cd backend
    python scripts/decrypt_backup.py abo-db-2026-10-16_0330-auto.abobak

Then restore the .dump yourself (see docs/DISASTER_RECOVERY.md).
"""
from __future__ import annotations

import getpass
import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.backup import crypto  # noqa: E402


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    src = Path(sys.argv[1])
    dst = src.with_suffix(".dump")
    if dst.exists():
        print(f"{dst} already exists — move it away first.")
        return 1
    passphrase = getpass.getpass("Backup password: ")
    try:
        with open(src, "rb") as fi, open(dst, "wb") as fo:
            meta = crypto.decrypt_stream(fi, fo, passphrase)
    except crypto.BackupCryptoError as exc:
        dst.unlink(missing_ok=True)
        print(f"FAILED: {exc}")
        return 1
    digest = hashlib.sha256(dst.read_bytes()).hexdigest()
    ok = digest == meta.get("dump_sha256")
    print(f"OK: {dst}  (PostgreSQL {meta.get('db_major')}, created {meta.get('created_at')})")
    print(f"dump checksum {'matches' if ok else 'DOES NOT MATCH'} the value recorded at backup time")
    rows = meta.get("rows") or {}
    print(f"tables: {len(rows)}, rows: {sum(rows.values())}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
