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
