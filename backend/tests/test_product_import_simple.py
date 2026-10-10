"""Simple Bangla import sheet (নাম, দাম, ক্রয়মূল্য, ক্যাটাগরি, স্টক, ছবির নাম)
and in-page fixes ("overrides") from the preview step. The contract template
(IMPORT_CONTRACT.md headers) must keep working exactly as before."""
from types import SimpleNamespace as NS

from app.core import product_import as pi


def _index():
    chg = NS(id="cat-1", slug="chargers", name_en="Chargers", name_bn="চার্জার", parent_id=None)
    return pi.CategoryIndex(by_slug={"chargers": chg}, by_name={"chargers": chg, "চার্জার": chg}, by_id={"cat-1": chg})


SIMPLE_HEADERS = ["নাম", "দাম", "ক্রয়মূল্য", "ক্যাটাগরি", "স্টক", "ছবির নাম"]


def test_bangla_headers_map_to_fields():
    m = pi.auto_map_headers(SIMPLE_HEADERS + ["আগের দাম", "ব্র্যান্ড", "বিবরণ", "SKU", "ইংরেজি নাম"])
    assert m == {
        "নাম": "name_bn", "দাম": "price", "ক্রয়মূল্য": "cost_price", "ক্যাটাগরি": "category",
        "স্টক": "stock_quantity", "ছবির নাম": "images", "আগের দাম": "original_price",
        "ব্র্যান্ড": "brand", "বিবরণ": "description_bn", "SKU": "sku", "ইংরেজি নাম": "name_en",
    }


def test_contract_headers_still_map():
    m = pi.auto_map_headers(["slug", "name_bn", "name_en", "category", "category_name_bn", "price", "cost_price", "images"])
    assert all(v == k for k, v in m.items())


def test_bangla_digits_and_taka_in_numbers():
    assert pi._coerce("price", "১,২৯০ টাকা") == (1290.0, None)
    assert pi._coerce("price", "৳950") == (950.0, None)
    assert pi._coerce("stock_quantity", "১০") == (10, None)


def test_slug_from_bangla_name():
    assert pi.slug_from_any("ফাস্ট চার্জার ৩৩W") == "fast-charjar-33w"
    assert pi.slug_from_any("Fast Charger") == "fast-charger"


def _simple_rows(*rows):
    return [dict(zip(SIMPLE_HEADERS, r)) for r in rows]


def test_simple_sheet_validates_without_english_columns():
    rows = _simple_rows(
        ("ফাস্ট চার্জার ৩৩W", "1290", "950", "চার্জার", "5", "c1.jpg"),
        ("নতুন হেডফোন", "800", "", "হেডফোন", "", ""),
    )
    res = pi.validate_rows(rows, pi.auto_map_headers(SIMPLE_HEADERS), _index(), set(), {})
    a, b = res
    assert a.errors == [] and a.action == "create"
    assert a.data["name_en"] == "ফাস্ট চার্জার ৩৩W" and a.data["slug"] == "fast-charjar-33w"
    assert a.data["category"] == "chargers" and a.category_id == "cat-1"
    # Unknown Bangla category -> a new category, not an error.
    assert b.errors == [] and b.new_category == {"slug": "hedfon", "name_en": "হেডফোন", "name_bn": "হেডফোন"}
    assert pi.new_categories(res)[0]["slug"] == "hedfon"


def test_contract_sheet_unknown_category_still_errors():
    headers = ["slug", "name_en", "name_bn", "category", "price"]
    rows = [dict(zip(headers, ("x", "X", "এক্স", "nope", "10")))]
    res = pi.validate_rows(rows, pi.auto_map_headers(headers), _index(), set(), {})
    assert res[0].action == "skip" and any("not found" in e for e in res[0].errors)


def test_overrides_fix_a_row_and_add_missing_column():
    rows = _simple_rows(("চার্জার এ", "", "", "চার্জার", "", ""))
    mapping = pi.auto_map_headers(SIMPLE_HEADERS)
    bad = pi.validate_rows(rows, mapping, _index(), set(), {})
    assert bad[0].errors  # price missing
    rows2, mapping2 = pi.apply_overrides(rows, mapping, {"2": {"price": "550", "name_en": "Charger A", "bogus": "x"}})
    assert rows[0]["দাম"] == ""  # inputs untouched
    assert mapping2["__fix_name_en"] == "name_en" and "bogus" not in str(mapping2)
    ok = pi.validate_rows(rows2, mapping2, _index(), set(), {})
    assert ok[0].errors == [] and ok[0].data["price"] == 550.0
    assert ok[0].data["name_en"] == "Charger A" and ok[0].data["slug"] == "charger-a"


def test_overrides_ignore_bad_rows():
    rows = _simple_rows(("ক", "1", "", "চার্জার", "", ""))
    mapping = pi.auto_map_headers(SIMPLE_HEADERS)
    assert pi.apply_overrides(rows, mapping, {"99": {"price": "1"}, "x": {}})[0] == rows
