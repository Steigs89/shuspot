# One-click deploy: Netlify (SPA) + Render (API)

## 1) Backend (Render)
- Create a new Web Service from GitHub repo `Steigs89/shuspot`.
- Root Directory: leave blank.
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn api.index:app --host 0.0.0.0 --port $PORT`
- Optional env: `PYTHON_VERSION=3.11`
- After deploy, copy your API base URL, e.g. `https://shuspot-api.onrender.com`.

## 2) Frontend (Netlify)
Option A — drag-and-drop `book-admin/` folder
- Edit `book-admin/_redirects`: replace `https://YOUR-RENDER-API.example.com` with your Render API URL.
- Visit app.netlify.com → Add new site → Deploy manually → drag `book-admin/` into the dropzone.

Option B — drag-and-drop `build/` folder
- Edit `build/_redirects`: replace the placeholder with your Render API URL.
- Drag `build/` into Netlify.

Netlify redirects included:
```
/api/* https://YOUR-RENDER-API.example.com/api/:splat 200
/* /index.html 200
```
This proxies all `/api/*` calls to your backend, avoiding CORS.

## 3) Test
- Open your Netlify site root `/` → SPA loads.
- Visit `/api/health` → should return 200 via proxy.
- Try an ingestion dry-run POST to `/api/shuspot-ingestion/ingest-manifest?safe=true&dry_run=true`.

## 4) Custom domain (optional)
- Add a domain in Netlify Settings and in Render for the API.
- Keep `_redirects` pointing to the Render API domain.