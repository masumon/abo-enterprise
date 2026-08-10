from app.api.v1.router import api_router


def test_verified_courier_update_precedes_legacy_order_route():
    matching = [
        route for route in api_router.routes
        if getattr(route, "path", None) == "/api/v1/orders/{order_id}/courier"
        and "PATCH" in getattr(route, "methods", set())
    ]
    assert matching
    assert matching[0].name == "verified_courier_update"
