from fastapi import FastAPI
from datetime import datetime

app = FastAPI()

@app.get("/")
def health_root():
    return {"ok": True, "service": "book-admin-api", "timestamp": datetime.now().isoformat()}
