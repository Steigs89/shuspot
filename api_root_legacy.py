"""
Legacy FastAPI app previously used during experiments.
Kept for reference; not used by Render or Netlify setup.
"""
from fastapi import FastAPI, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

app = FastAPI(title="Legacy Root API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Legacy root API is running"}

@app.get("/health")
@app.get("/api/health")
async def health():
    return {"ok": True, "service": "legacy-root-api", "version": "1.0.1"}

@app.get("/ping")
@app.get("/api/ping")
async def ping():
    return {"timestamp": datetime.now().isoformat(), "service": "legacy-root-api", "version": "1.0.1"}
