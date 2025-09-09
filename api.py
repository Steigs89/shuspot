from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "API is running"}

@app.get("/health")
@app.get("/api/health")
async def health():
    """Health check endpoint for the API"""
    return {"ok": True, "service": "book-admin-api", "version": "1.0.1"}

@app.get("/ping")
@app.get("/api/ping")
async def ping():
    """Ping endpoint for the API with timestamp"""
    return {"timestamp": datetime.now().isoformat(), "service": "book-admin-api", "version": "1.0.1"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
