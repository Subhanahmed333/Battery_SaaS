import subprocess
import os
import time
import sys
import webbrowser

# Get the directory where the script/exe is actually located
if getattr(sys, 'frozen', False):  # running as .exe
    BASE_DIR = os.path.dirname(sys.executable)
else:  # running as .py
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Paths
backend_path = os.path.join(BASE_DIR, "backend")
frontend_path = os.path.join(BASE_DIR, "frontend")

# Start backend (hidden window)
backend_process = subprocess.Popen(
    ["python", "server.py"],
    cwd=backend_path,
    creationflags=subprocess.CREATE_NO_WINDOW
)

# Give backend time to start and verify it's running
print("Starting backend server...")
max_retries = 10
retry_count = 0
backend_ready = False

while retry_count < max_retries and not backend_ready:
    try:
        # Check if backend is responding
        import requests
        response = requests.get("http://localhost:8001/docs")
        if response.status_code == 200:
            backend_ready = True
            print("Backend server started successfully!")
        else:
            retry_count += 1
            time.sleep(2)
    except Exception:
        retry_count += 1
        time.sleep(2)
        print(f"Waiting for backend to start... ({retry_count}/{max_retries})")

if not backend_ready:
    print("WARNING: Backend server might not have started properly.")
    print("The application may not function correctly.")
else:
    print("Backend server is running on http://localhost:8001")

# Start frontend (hidden window)
subprocess.Popen(
    ["npm", "start"],
    cwd=frontend_path,
    shell=True,
    creationflags=subprocess.CREATE_NO_WINDOW
)

# Open frontend in browser
time.sleep(3)
webbrowser.open("http://localhost:3000")
