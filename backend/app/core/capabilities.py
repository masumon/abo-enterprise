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


def get_capabilities(entity: Any) -> set[Capability]:
    """Infer the set of capabilities for a commerce entity instance.

    Inference is based on fields that already exist on the model:
    - a sellable product (has a numeric ``price``) is ORDERABLE;
    - a service (has a ``pricing_type``) is BOOKABLE.

    Explicit per-entity overrides are honoured first via optional columns
    (``is_orderable`` / ``is_bookable``) if a future migration adds them, so
    admins can flip capability without code changes. Absent those columns the
    rule falls back to structural inference.
    """
    caps: set[Capability] = set()

    explicit_orderable = getattr(entity, "is_orderable", None)
    explicit_bookable = getattr(entity, "is_bookable", None)

    if explicit_orderable is True:
        caps.add(Capability.ORDERABLE)
    if explicit_bookable is True:
        caps.add(Capability.BOOKABLE)

    # Structural inference (only when not explicitly overridden).
    if explicit_orderable is None and _is_product(entity) and getattr(entity, "price", None) is not None:
        caps.add(Capability.ORDERABLE)
    if explicit_bookable is None and _is_service(entity) and getattr(entity, "pricing_type", None):
        caps.add(Capability.BOOKABLE)

    return caps


def is_orderable(entity: Any) -> bool:
    return Capability.ORDERABLE in get_capabilities(entity)


def is_bookable(entity: Any) -> bool:
    return Capability.BOOKABLE in get_capabilities(entity)
