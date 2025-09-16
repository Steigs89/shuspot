# Catch-all dynamic API route for Vercel to route /api/* to the same FastAPI app
# This ensures endpoints like /api/health and /api/shuspot-ingestion/ingest-manifest resolve

from .index import app as app  # re-export the FastAPI app
