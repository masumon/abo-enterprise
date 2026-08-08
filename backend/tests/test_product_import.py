"""Unit tests for the bulk product-import core (parsing, mapping, coercion,
category matching, validation). No DB needed — CategoryIndex is built from
lightweight stand-ins, mirroring the real Category attributes used."""
from types import SimpleNamespace as NS

from app.core import product_import as pi


def _index():
    chg = NS(id="cat-1", slug="chargers", name_en="Chargers", name_bn="চার্জার", parent_id=None)
    phone = NS(id="cat-2", slug="phones", name_en="Phones", name_bn="ফোন", parent_id=None)
    return pi.CategoryIndex(
        by_slug={"chargers": chg, "phones": phone},
        by_name={"chargers": chg, "চার্জার": chg, "phones": phone, "ফোন": phone},
        by_id={"cat-1": chg, "cat-2": phone},
    )


def test_header_auto_mapping_aliases():
    m = pi.auto_map_headers(["Slug", "Name (English)", "Price", "SKU", "Stock", "Image"])
    assert m["Name (English)"] == "name_en"
    assert m["Price"] == "price"
    assert m["SKU"] == "sku"
    assert m["Stock"] == "stock_quantity"
    assert m["Image"] == "image_url"


def test_value_coercion():
    assert pi._coerce("is_active", "Yes") == (True, None)
    assert pi._coerce("stock_quantity", "5.0") == (5, None)
    assert pi._coerce("price", "1,490") == (1490.0, None)
    assert pi._coerce("images", "a.jpg | b.jpg, c.jpg") == (["a.jpg", "b.jpg", "c.jpg"], None)
    val, err = pi._coerce("is_active", "maybe")
    assert val is None and "yes/no" in err


def test_parse_csv_skips_blank_and_reads_rows():
    data = ("slug,name_en,price\n" "p1,One,10\n" "\n" "p2,Two,20\n").encode()
    headers, rows = pi.parse_file("x.csv", data)
    assert headers == ["slug", "name_en", "price"]
    assert len(rows) == 2 and rows[1]["name_en"] == "Two"


def test_validate_create_update_duplicate_category_and_sku():
    rows = [
        {"slug": "p1", "name_en": "Case", "name_bn": "কেস", "category": "chargers", "price": "299", "sku": "SKU1"},
        {"slug": "", "name_en": "No Slug", "name_bn": "নাম", "category": "Chargers", "price": "100"},   # slug derived, cat by name
        {"slug": "p1", "name_en": "Dup", "name_bn": "ডুপ", "category": "chargers", "price": "50"},       # dup slug
        {"slug": "p5", "name_en": "Neg", "name_bn": "খ", "category": "chargers", "price": "-5"},         # negative price
        {"slug": "p6", "name_en": "BadCat", "name_bn": "ন", "category": "nope", "price": "20"},          # missing category
        {"slug": "existing", "name_en": "Upd", "name_bn": "আপ", "category": "phones", "price": "999"},   # update
    ]
    mapping = {k: k for k in ("slug", "name_en", "name_bn", "category", "price", "sku")}
    res = pi.validate_rows(
        rows, mapping, _index(),
        existing_slugs={"existing"},
        existing_sku_to_slug={"SKU1": "another-prod"},
    )
    assert res[0].action == "create" and res[0].category_id == "cat-1"
    assert any("already used" in w for w in res[0].warnings)          # SKU1 owned elsewhere
    assert res[1].data["slug"] == "no-slug" and res[1].action == "create"
    assert res[2].action == "skip" and any("duplicate slug" in e for e in res[2].errors)
    assert res[3].action == "skip" and any("negative" in e for e in res[3].errors)
    assert res[4].action == "skip" and any("not found" in e for e in res[4].errors)
    assert res[5].action == "update"


def test_on_existing_skip_and_on_new_skip():
    rows = [
        {"slug": "new1", "name_en": "N", "name_bn": "ন", "category": "chargers", "price": "10"},
        {"slug": "old1", "name_en": "O", "name_bn": "ও", "category": "chargers", "price": "10"},
    ]
    mapping = {k: k for k in ("slug", "name_en", "name_bn", "category", "price")}
    res = pi.validate_rows(
        rows, mapping, _index(), existing_slugs={"old1"}, existing_sku_to_slug={},
        on_existing="skip", on_new="skip",
    )
    assert res[0].action == "skip" and res[1].action == "skip"


def test_category_path_matching_uses_last_segment():
    idx = _index()
    node = idx.resolve("Electronics > Phones")
    assert node is not None and node.slug == "phones"
