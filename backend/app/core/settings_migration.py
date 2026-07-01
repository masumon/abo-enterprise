"""
Migration guide for consolidating Setting and AdminSetting tables.
Run this manually during deployment:

1. Backup both tables
2. Merge data from admin_settings into settings (prefixed keys)
3. Update all code to use single settings table
4. Drop admin_settings table
"""

from sqlalchemy import text

async def migrate_settings(session):
    """
    Consolidate admin_settings into settings table.
    - Prefixes all admin settings keys with 'admin_'
    - Preserves all metadata (category, display_type, etc) in JSON
    """
    from app.models.models import Setting, AdminSetting

    admin_settings = await session.execute(
        "SELECT * FROM admin_settings WHERE is_deleted = false"
    )

    for row in admin_settings:
        setting = Setting(
            key=f"admin_{row.key}",
            value=row.value,
            data_type=row.data_type,
            description=row.description_en or row.description_bn,
            is_secret=row.is_secret,
            is_editable=row.is_editable,
            _metadata={
                "category": row.category,
                "display_type": row.display_type,
                "sort_order": row.sort_order,
                "description_bn": row.description_bn,
            }
        )
        session.add(setting)

    await session.commit()
    print("✓ Settings migrated. Drop admin_settings table manually after verification.")
