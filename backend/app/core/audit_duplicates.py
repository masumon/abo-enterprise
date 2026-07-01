"""
Audit script to detect and report duplicate settings and media entries
Run this to check for data integrity issues in production
"""

import asyncio
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
from app.models.models import Setting, AdminSetting, MediaAsset

async def audit_duplicates():
    """Audit for duplicate settings and media assets"""

    _url = settings.DATABASE_URL
    _is_supabase = "supabase.co" in _url or "pooler.supabase.com" in _url
    _connect_args = {"ssl": "require"} if _is_supabase else {}

    engine = create_async_engine(
        _url,
        pool_size=3,
        max_overflow=5,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args=_connect_args,
    )

    AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as session:
        print("🔍 AUDITING DATABASE FOR DUPLICATES...\n")

        # Check 1: Duplicate settings keys
        print("1️⃣  Checking for duplicate settings keys...")
        result = await session.execute(
            select(Setting.key, func.count(Setting.id).label('count'))
            .group_by(Setting.key)
            .having(func.count(Setting.id) > 1)
        )
        dup_settings = result.all()
        if dup_settings:
            print("   ⚠️  DUPLICATES FOUND:")
            for key, count in dup_settings:
                print(f"      - {key}: {count} records")
        else:
            print("   ✅ No duplicate setting keys found")

        # Check 2: Duplicate admin settings keys
        print("\n2️⃣  Checking for duplicate admin_settings keys...")
        result = await session.execute(
            select(AdminSetting.key, func.count(AdminSetting.id).label('count'))
            .group_by(AdminSetting.key)
            .having(func.count(AdminSetting.id) > 1)
        )
        dup_admin = result.all()
        if dup_admin:
            print("   ⚠️  DUPLICATES FOUND:")
            for key, count in dup_admin:
                print(f"      - {key}: {count} records")
        else:
            print("   ✅ No duplicate admin_setting keys found")

        # Check 3: Duplicate media URLs
        print("\n3️⃣  Checking for duplicate media URLs...")
        result = await session.execute(
            select(MediaAsset.url, func.count(MediaAsset.id).label('count'))
            .group_by(MediaAsset.url)
            .having(func.count(MediaAsset.id) > 1)
        )
        dup_media = result.all()
        if dup_media:
            print("   ⚠️  DUPLICATES FOUND:")
            for url, count in dup_media:
                print(f"      - {url}: {count} records")
        else:
            print("   ✅ No duplicate media URLs found")

        # Check 4: Soft-deleted duplicates
        print("\n4️⃣  Checking for soft-deleted items that might conflict...")
        result = await session.execute(
            select(Setting.key, func.count(Setting.id).label('count'))
            .where(Setting.is_deleted == False)
            .group_by(Setting.key)
            .having(func.count(Setting.id) > 1)
        )
        active_dups = result.all()
        if active_dups:
            print("   ⚠️  ACTIVE DUPLICATES NEED CLEANUP:")
            for key, count in active_dups:
                print(f"      - {key}: {count} active records")
        else:
            print("   ✅ No active duplicate settings found")

        # Summary
        print("\n" + "="*50)
        total_issues = len(dup_settings) + len(dup_admin) + len(dup_media) + len(active_dups)
        if total_issues == 0:
            print("✅ DATABASE INTEGRITY: CLEAN")
        else:
            print(f"⚠️  DATABASE INTEGRITY ISSUES: {total_issues} found")
            print("   Recommend manual review and cleanup of duplicates")
        print("="*50)

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(audit_duplicates())
