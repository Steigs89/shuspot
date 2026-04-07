#!/usr/bin/env python3
"""
Start Local Server Script
Run this once and the server stays running in background
"""

import os
import sys
import subprocess
import signal
import time
from pathlib import Path

def check_server_running():
    """Check if server is already running on port 8000"""
    try:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('127.0.0.1', 8000))
        sock.close()
        return result == 0
    except:
        return False

def install_requirements():
    """Install required packages"""
    print("📦 Installing required packages...")
    try:
        subprocess.run([
            sys.executable, '-m', 'pip', 'install', 
            'flask', 'flask-cors', 'requests'
        ], check=True)
        print("✅ Packages installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install packages: {e}")
        return False
    return True

def start_server():
    """Start the local server"""
    server_script = Path(__file__).parent / 'local_server.py'
    
    if not server_script.exists():
        print(f"❌ Server script not found: {server_script}")
        return None
    
    print("🚀 Starting local server...")
    
    # Start server as background process
    process = subprocess.Popen([
        sys.executable, str(server_script)
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Wait a moment for server to start
    time.sleep(2)
    
    if check_server_running():
        print("✅ Server started successfully!")
        print("🌐 Server running at: http://localhost:8000")
        print("🔍 Health check: http://localhost:8000/health")
        print("📝 Manifest generation: http://localhost:8000/generate-manifest")
        return process
    else:
        print("❌ Server failed to start")
        return None

def main():
    print("🔧 ShuSpot Local Server Startup")
    print("=" * 40)
    
    # Check if already running
    if check_server_running():
        print("✅ Server is already running on http://localhost:8000")
        print("🎉 You're all set! The manifest generator should work now.")
        return
    
    # Install requirements
    if not install_requirements():
        print("❌ Failed to install requirements")
        return
    
    # Start server
    process = start_server()
    if not process:
        print("❌ Failed to start server")
        return
    
    print("\n🎉 SUCCESS! Local server is now running!")
    print("📋 What you can do now:")
    print("  • Use the 'Generate Manifest' tab in your browser")
    print("  • Server will keep running until you restart your computer")
    print("  • To stop server: press Ctrl+C or close this terminal")
    
    try:
        # Keep the script running to monitor the server
        while True:
            if not check_server_running():
                print("⚠️ Server stopped unexpectedly, restarting...")
                process = start_server()
                if not process:
                    break
            time.sleep(10)  # Check every 10 seconds
    except KeyboardInterrupt:
        print("\n🛑 Stopping server...")
        if process:
            process.terminate()
        print("✅ Server stopped")

if __name__ == '__main__':
    main()