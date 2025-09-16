"""
Book Admin API package.

This file ensures the `api` directory is treated as a Python package so that
`from api.index import app` works in environments that don't support implicit
namespace packages.
"""

# Expose app for convenience when importing `api` directly
try:
    from .index import app  # noqa: F401
except Exception:
    # During build or when dependencies aren't installed yet, this may fail.
    # Importers can still access `api.index:app` directly.
    pass
