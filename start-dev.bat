@echo off
setlocal EnableDelayedExpansion

set "ROOT=%~dp0"

echo.
echo ============================================
echo   PulseDesk - Start Development Servers
echo ============================================
echo.

:: ── Pre-flight checks ────────────────────────
if not exist "%ROOT%server\node_modules" (
    echo [ERROR] Server dependencies missing. Run setup.bat first.
    pause & exit /b 1
)

if not exist "%ROOT%client\node_modules" (
    echo [ERROR] Client dependencies missing. Run setup.bat first.
    pause & exit /b 1
)

if not exist "%ROOT%server\.env" (
    echo [ERROR] server\.env not found. Run setup.bat first.
    pause & exit /b 1
)

:: ── Ensure Postgres container is up ──────────
where docker >nul 2>&1
if %errorlevel% equ 0 (
    echo [*] Ensuring PostgreSQL container is running...
    cd /d "%ROOT%"
    docker-compose up -d >nul 2>&1
)

echo.
echo [*] Launching API server  ^(http://localhost:4000^)
echo [*] Launching client      ^(http://localhost:5173^)
echo.
echo     Each server opens in its own terminal window.
echo     Close those windows ^(or press Ctrl+C inside them^) to stop.
echo.

:: Start API server in a new window
start "PulseDesk API" cmd /k "cd /d "%ROOT%server" && npm run dev"

:: Brief pause so the API gets a head start before the client opens
timeout /t 2 /nobreak >nul

:: Start Vite dev server in a new window
start "PulseDesk Client" cmd /k "cd /d "%ROOT%client" && npm run dev"

echo [OK] Both servers are starting up.
echo.
echo   API health:  http://localhost:4000/health
echo   App:         http://localhost:5173
echo   DB studio:   cd server  then  npm run db:studio
echo.
cd /d "%ROOT%"
pause
