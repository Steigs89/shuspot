# Local File Access with Tunnel

This guide explains how to use the ManifestGenerator with your local files while keeping your frontend deployed.

## Quick Setup

### Option 1: Using ngrok (Recommended)

1. **Install ngrok:**
   ```bash
   # Via npm
   npm install -g ngrok
   
   # Via Homebrew (Mac)
   brew install ngrok
   ```

2. **Run your local backend:**
   ```bash
   cd book-admin/backend
   python3 -m uvicorn main:app --reload --port 8000
   ```

3. **Create tunnel (in another terminal):**
   ```bash
   ngrok http 8000
   ```

4. **Use the tunnel in ManifestGenerator:**
   - Check "Use Local Tunnel" 
   - Enter the ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Now you can use local paths like `/Users/ethan.steigerwald/Downloads/CROP-ShuSpot/Fractions`

### Option 2: Using Cloudflare Tunnel

1. **Install cloudflared:**
   ```bash
   brew install cloudflare/cloudflare/cloudflared
   ```

2. **Run tunnel:**
   ```bash
   cloudflared tunnel --url http://localhost:8000
   ```

### Option 3: Simple Script

Run the provided script:
```bash
./scripts/start-local-tunnel.sh
```

## How It Works

1. **Local Backend** runs on your computer with access to your local files
2. **Tunnel Service** (ngrok/cloudflare) creates a public URL pointing to your local backend  
3. **Live Frontend** calls the tunnel URL instead of the deployed API
4. **Manifest Generation** can now access your local folders and generate manifests

## Benefits

- ✅ Keep using the deployed frontend
- ✅ Access local files directly
- ✅ No need to upload large folder structures
- ✅ Fast iteration and testing
- ✅ Can push generated manifests to Supabase from local backend

## Security Note

Only use tunnels for development! Never expose sensitive data through public tunnels in production.