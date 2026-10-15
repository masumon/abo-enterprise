"""Independent database backup: pg_dump → verify → encrypt → any drive.

Modules:
  crypto     — public-key encrypted ``.abobak`` files (server can encrypt, only
               the owner's passphrase can decrypt)
  pgtools    — pinned, hash-verified pg_dump/pg_restore binaries
  providers  — Google Drive, OneDrive, Dropbox, S3-compatible, WebDAV
  store      — config/secrets/history kept in the ``settings`` table (no SQL)
  engine     — run a backup, retention, verify, restore test
"""
