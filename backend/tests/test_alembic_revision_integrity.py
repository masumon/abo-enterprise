"""Guard the migration graph against duplicate or dangling revision IDs."""

import ast
from pathlib import Path


VERSIONS_DIR = Path(__file__).resolve().parents[1] / "alembic" / "versions"


def _revision_metadata(path: Path) -> tuple[str | None, str | None]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    values: dict[str, str | None] = {"revision": None, "down_revision": None}
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id in values:
                    if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                        values[target.id] = node.value.value
                    elif isinstance(node.value, ast.Constant) and node.value.value is None:
                        values[target.id] = None
    return values["revision"], values["down_revision"]


def test_alembic_revision_ids_are_unique_and_dependencies_exist():
    metadata = [_revision_metadata(path) for path in sorted(VERSIONS_DIR.glob("*.py"))]
    revisions = [revision for revision, _ in metadata if revision]

    assert len(revisions) == len(set(revisions)), "Duplicate Alembic revision IDs found"

    revision_set = set(revisions)
    dangling = [
        down_revision
        for _, down_revision in metadata
        if down_revision and down_revision not in revision_set
    ]
    assert dangling == [], f"Dangling Alembic down_revision values: {dangling}"
