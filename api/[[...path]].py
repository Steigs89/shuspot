"""
Optional catch-all so both /api and /api/* map to the FastAPI app.
"""
from .index import app as app
