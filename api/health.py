from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def health_root():
    return {"ok": True, "service": "book-admin-api"}
