from fastapi import FastAPI
from datetime import datetime

app = FastAPI()

@app.get("/")
def ping_root():
    return {"timestamp": datetime.now().isoformat(), "service": "book-admin-api"}
