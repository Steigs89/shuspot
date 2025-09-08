from fastapi import FastAPI
import os, sys

app = FastAPI()

@app.get("/")
def ping():
    return {
        "ok": True,
        "python": sys.version.split()[0],
        "cwd": os.getcwd(),
        "env": {
            "TMPDIR": os.environ.get("TMPDIR", "/tmp"),
        }
    }
