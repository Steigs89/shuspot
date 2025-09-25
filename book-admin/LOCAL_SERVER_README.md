# 🚀 ShuSpot Local Server Setup

This local server enables the **Generate Manifest** feature in your ShuSpot admin interface.

## 🎯 Quick Start

### Option 1: One-Click Start (Recommended)

**On Mac/Linux:**
```bash
cd book-admin
./start_server.sh
```

**On Windows:**
```cmd
cd book-admin
start_server.bat
```

### Option 2: Manual Start
```bash
cd book-admin
python3 start_local_server.py
```

## ✅ What This Does

1. **Installs required packages** (Flask, Flask-CORS)
2. **Starts local server** on `http://localhost:8000`
3. **Keeps running in background** until you stop it
4. **Auto-restarts** if it crashes
5. **Enables manifest generation** in your browser

## 🌐 Server Endpoints

- **Health Check:** `http://localhost:8000/health`
- **Generate Manifest:** `http://localhost:8000/generate-manifest`
- **Serve Images:** `http://localhost:8000/shuspot-images/...`

## 🎉 After Starting

1. ✅ Server runs on `http://localhost:8000`
2. ✅ Go to your ShuSpot admin in browser
3. ✅ Click "Generate Manifest" tab
4. ✅ Enter your local folder path (e.g., `/Users/yourname/Desktop/BookFolder`)
5. ✅ Click "Generate Manifest" - it should work now!

## 🛑 How to Stop

- **Press `Ctrl+C`** in the terminal where server is running
- **Close the terminal window**
- **Restart your computer** (server will stop)

## 🔧 Troubleshooting

### "Connection Refused" Error
- Make sure the server is running: `http://localhost:8000/health`
- Restart the server: run the start script again

### "Port Already in Use"
- Server is already running (good!)
- Or another app is using port 8000
- Check: `lsof -i :8000` (Mac/Linux) or `netstat -an | findstr :8000` (Windows)

### "Permission Denied"
- On Mac/Linux: `chmod +x start_server.sh`
- Run as administrator if needed

### "Python Not Found"
- Install Python 3.7+ from python.org
- Use `python3` instead of `python` on Mac/Linux

## 📁 File Structure

```
book-admin/
├── local_server.py          # Main server code
├── start_local_server.py    # Startup script
├── start_server.sh          # Mac/Linux launcher
├── start_server.bat         # Windows launcher
└── tools/
    └── quick_manifest.py    # Manifest generation script
```

## 🔄 How It Works

1. **Frontend** (browser) sends request to `localhost:8000/generate-manifest`
2. **Local server** receives request with folder path and metadata
3. **Server** runs `tools/quick_manifest.py` with your folder
4. **Script** scans folder, generates manifest JSON
5. **Server** returns manifest data to browser
6. **Frontend** displays the generated manifest

## 🎯 Benefits

- ✅ **Run once, always works** - no need to restart
- ✅ **Access local folders** - can read your computer's files
- ✅ **Fast processing** - runs locally, no upload needed
- ✅ **Automatic restart** - recovers from crashes
- ✅ **Simple setup** - one command to start

## 🚀 Next Steps

After starting the server:

1. **Test it:** Visit `http://localhost:8000/health`
2. **Use it:** Go to Generate Manifest tab in browser
3. **Generate:** Enter local folder path and create manifests
4. **Upload:** Use generated manifests in your ShuSpot system

The server will keep running until you stop it or restart your computer!