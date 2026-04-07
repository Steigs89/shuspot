from fastapi import FastAPI
from datetime import datetime

app = FastAPI()

@app.get("/")
def ping_root():
    return {"timestamp": datetime.now().isoformat(), "service": "book-admin-api"}
from fastapi import FastAPI
import os, sys

app = FastAPI()

def payload():
    return {
        "ok": True,
        "python": sys.version.split()[0],
        "cwd": os.getcwd(),
        "env": {
            "TMPDIR": os.environ.get("TMPDIR", "/tmp"),
        }
    }

@app.get("/")
def ping_root():
    return payload()

@app.get("/api/ping")
def ping_full():
    return payload()

@app.get("/api/healthz")
def healthz():
    return payload()
