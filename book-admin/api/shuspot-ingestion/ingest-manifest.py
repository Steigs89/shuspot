from fastapi import FastAPI, Request, Query, HTTPException
from datetime import datetime
import os, json
from typing import Any, Dict

app = FastAPI()

TMP_DIR = os.environ.get("TMPDIR", "/tmp")
DB_PATH = os.path.join(TMP_DIR, "books.json")

def load_db() -> Dict[str, Any]:
    if os.path.exists(DB_PATH):
        try:
            with open(DB_PATH, 'r') as f:
                return json.load(f)
        except Exception:
            return {"books": []}
    return {"books": []}

def save_db(data: Dict[str, Any]):
    try:
        with open(DB_PATH, 'w') as f:
            json.dump(data, f)
    except Exception:
        pass

@app.post("/")
async def ingest_manifest(request: Request, safe: bool = Query(True), dry_run: bool = Query(False)):
    try:
        payload = await request.json()
        books = payload.get("books", []) if isinstance(payload, dict) else (payload if isinstance(payload, list) else [])
        if not books:
            if safe:
                return {"success": False, "db_imported": 0, "errors": ["No books provided in manifest"]}
            raise HTTPException(status_code=400, detail="No books provided in manifest")

        if dry_run:
            return {"message": f"Validated {len(books)} books (dry-run)", "db_imported": 0, "success": True, "errors": []}

        db = load_db()
        existing = db.get("books", [])
        base_id = len(existing)
        for i, b in enumerate(books):
            b2 = dict(b)
            b2["id"] = base_id + i + 1
            existing.append(b2)
        db["books"] = existing
        save_db(db)
        return {"message": f"Imported {len(books)} books", "db_imported": len(books), "success": True, "errors": []}
    except Exception as e:
        if safe:
            return {"success": False, "db_imported": 0, "errors": [str(e)]}
        raise
