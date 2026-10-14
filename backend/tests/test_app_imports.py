"""Every API route module must import — a syntax error there stops the whole API."""
import importlib
import pkgutil

import app.api.v1.routes as routes


def test_all_route_modules_import():
    for mod in pkgutil.iter_modules(routes.__path__):
        importlib.import_module(f"{routes.__name__}.{mod.name}")


def test_app_builds():
    from app.main import app

    assert app.routes
