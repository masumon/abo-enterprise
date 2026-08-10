from app.api.v1.routes.courier import _map_provider_status


def test_delivered_requires_authoritative_provider_state():
    assert _map_provider_status("delivered", "shipped") == "delivered"
    assert _map_provider_status("delivered_approval_pending", "shipped") == "shipped"


def test_cancelled_requires_authoritative_provider_state():
    assert _map_provider_status("cancelled", "shipped") == "cancelled"
    assert _map_provider_status("cancelled_approval_pending", "shipped") == "shipped"


def test_non_terminal_provider_state_does_not_downgrade_terminal_local_state():
    assert _map_provider_status("pending", "delivered") == "delivered"
    assert _map_provider_status("hold", "cancelled") == "cancelled"


def test_unknown_non_terminal_provider_state_proves_shipment_but_not_delivery():
    assert _map_provider_status("unknown", "confirmed") == "shipped"
