Deployment shape

- Frontend:
  - Served from committed build/ directory via vercel.json rewrites.
- Backend:
  - Python Serverless Functions in root api/.
- Vercel Project Settings:
  - Root Directory: blank, Build/Install/Output: blank.
  - Always redeploy from source after changing settings.
