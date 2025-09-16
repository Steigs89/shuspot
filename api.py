"""
This file formerly hosted a FastAPI app at the repository root.

To avoid name collisions with the main package directory `api/`,
we've deprecated this module. The canonical app is `api.index:app`.

If you need a quick local run, we re-export the main app below.
"""

try:
    from api.index import app  # re-export main FastAPI app
except Exception as e:
    # Provide a helpful error message if the package isn't available
    raise RuntimeError(
        "Expected package directory 'api/' with 'index.py' to exist."
    ) from e
