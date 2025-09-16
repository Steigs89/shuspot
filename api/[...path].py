"""
Catch-all route for Vercel to send any /api/* request to the FastAPI app.
This ensures endpoints like /api/health and /api/shuspot-ingestion/ingest-manifest resolve.
"""
from .index import app as app  # re-export FastAPI app for Vercel
