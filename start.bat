@echo off
echo ====================================
echo    Starting SimuMarty WebSocket
echo ====================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.7+
    pause
    exit /b 1
)
echo [OK] Python found

REM Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js
    pause
    exit /b 1
)
echo [OK] Node.js found
echo.

REM Install Python dependencies
echo Installing Python dependencies...
cd python_marty
pip install -q -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies
    cd ..
    pause
    exit /b 1
)
echo [OK] Python dependencies installed
cd ..

REM Install Node dependencies if needed
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install Node.js dependencies
        pause
        exit /b 1
    )
    echo [OK] Node.js dependencies installed
) else (
    echo [OK] Node.js dependencies already installed
)

echo.
echo ====================================
echo Starting servers...
echo ====================================
echo.

REM Start WebSocket server in new window
echo Starting WebSocket Server...
start "MartyEngine WebSocket Server" cmd /k "cd python_marty && python websocket_server.py"
timeout /t 3 /nobreak >nul

REM Start Vite dev server in new window
echo Starting Frontend Dev Server...
start "SimuMarty Frontend" cmd /k "npm run dev"

echo.
echo ====================================
echo   SimuMarty is running!
echo ====================================
echo.
echo Frontend: http://localhost:5173
echo WebSocket: ws://localhost:8765
echo.
echo Two windows have opened:
echo 1. WebSocket Server (Python)
echo 2. Frontend Server (Vite)
echo.
echo Close those windows to stop the servers.
echo.
pause
