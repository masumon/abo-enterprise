"""Commerce capability layer.

A single, declarative place that answers: *what can be done with this
commerce entity?* Capabilities are inferred from the entity's own data
(fields that already exist in the schema) rather than hardcoded at each call
site, so the rule lives in one location and new entity kinds slot in without
touching the checkout/booking code.

Current mapping (derived from the actual models):
- ``Product``  → ORDERABLE   (has ``price`` + participates in OrderItem)
- ``Service``  → BOOKABLE     (has ``pricing_type`` + drives BookingV2)

The design is intentionally extensible: an entity may declare *more than one*
capability (e.g. a future product that also needs on-site installation would
be both ORDERABLE and BOOKABLE). Nothing here mutates data or touches the DB;
it only reads attributes, so it is safe to call from any layer.
"""

from __future__ import annotations

from enum import Enum
from typing import Any


class Capability(str, Enum):
    ORDERABLE = "orderable"  # can be added to cart and checked out as an Order
    BOOKABLE = "bookable"    # can be requested via a (dynamic) booking form


def _is_product(entity: Any) -> bool:
    return entity.__class__.__name__ == "Product" or getattr(entity, "__tablename__", None) == "products"


def _is_service(entity: Any) -> bool:
    return entity.__class__.__name__ == "Service" or getattr(entity, "__tablename__", None) == "services"


def capabilities_for(
    kind: str,
    is_orderable: bool | None,
    is_bookable: bool | None,
) -> set[Capability]:
    """Single source of the capability rule, working on plain flags.

    ``kind`` is ``"product"`` or ``"service"``. Rule:
    - an explicit ``True`` override always grants the capability;
    - otherwise a product is ORDERABLE by default and a service is BOOKABLE by
      default (``None`` = infer from kind);
    - an explicit ``False`` disables the inferred capability.

    Both the ORM helper below and the API schemas call this, so the rule lives
    in exactly one place.
    """
    caps: set[Capability] = set()

    if is_orderable is True or (is_orderable is None and kind == "product"):
        caps.add(Capability.ORDERABLE)
    if is_bookable is True or (is_bookable is None and kind == "service"):
        caps.add(Capability.BOOKABLE)

    return caps


def get_capabilities(entity: Any) -> set[Capability]:
    """Infer the set of capabilities for a commerce entity ORM instance.

    Delegates the rule to :func:`capabilities_for`; this wrapper only resolves
    the entity ``kind`` and reads the optional override columns.
    """
    if _is_product(entity):
        kind = "product"
    elif _is_service(entity):
        kind = "service"
    else:
        return set()

    return capabilities_for(
        kind,
        getattr(entity, "is_orderable", None),
        getattr(entity, "is_bookable", None),
    )


def is_orderable(entity: Any) -> bool:
    return Capability.ORDERABLE in get_capabilities(entity)


def is_bookable(entity: Any) -> bool:
    return Capability.BOOKABLE in get_capabilities(entity)
