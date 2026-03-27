@echo off
echo ==========================================
echo   LTTS Test Portal - One-Click Startup
echo ==========================================
echo.

if not exist "node_modules" (
    echo [1/3] Installing root dependencies...
    call npm install
)

if not exist "client\node_modules" (
    echo [2/3] Installing client dependencies...
    cd client
    call npm install
    cd ..
)

if not exist "server\node_modules" (
    echo [3/3] Installing server dependencies...
    cd server
    call npm install
    cd ..
)

echo.
echo [High Five] Starting Development Server...
echo Client: http://localhost:4200
echo Server: http://localhost:5000
echo.

npm run dev
