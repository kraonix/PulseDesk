@echo off
setlocal EnableDelayedExpansion

:: Resolve the directory this batch file lives in (trailing backslash included)
set "ROOT=%~dp0"

echo.
echo ============================================
echo   PulseDesk - First-Time Setup
echo ============================================
echo.

:: ── Check Node.js ────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install Node.js 20+ from https://nodejs.org
    pause & exit /b 1
)
echo [OK] Node.js  & node -v

:: ── Check npm ────────────────────────────────
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found.
    pause & exit /b 1
)
echo [OK] npm  & npm -v

:: ── Check Docker (optional) ──────────────────
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Docker not found - skipping docker-compose.
    echo        Make sure PostgreSQL is running on port 5432 before continuing.
    set "SKIP_DOCKER=1"
) else (
    echo [OK] Docker found
    set "SKIP_DOCKER=0"
)

echo.
echo [1/5] Starting PostgreSQL via Docker Compose...
if "%SKIP_DOCKER%"=="0" (
    cd /d "%ROOT%"
    docker-compose up -d
    if %errorlevel% neq 0 (
        echo [ERROR] docker-compose failed. Is Docker Desktop running?
        pause & exit /b 1
    )
    echo       Waiting 4s for Postgres to be ready...
    timeout /t 4 /nobreak >nul
) else (
    echo       Skipped.
)

echo.
echo [2/5] Installing server dependencies...
cd /d "%ROOT%server"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed in server\
    pause & exit /b 1
)
echo [OK] Server dependencies installed.

echo.
echo [3/5] Configuring server environment...
cd /d "%ROOT%server"
if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo       Created server\.env from .env.example
    echo.
    echo [NOTICE] server\.env has been created with defaults for local Docker Postgres.
    echo          Update JWT_ACCESS_SECRET and JWT_REFRESH_SECRET before deploying.
    echo.
) else (
    echo       server\.env already exists, skipping.
)

echo.
echo [4/5] Running Prisma database migration...
cd /d "%ROOT%server"
call npx prisma migrate dev --name init
if %errorlevel% neq 0 (
    echo [ERROR] Prisma migration failed.
    echo        Make sure PostgreSQL is running and DATABASE_URL in server\.env is correct.
    pause & exit /b 1
)
echo [OK] Database migrated.

echo.
echo [4b] Seeding database with sample data...
cd /d "%ROOT%server"
call npm run db:seed
if %errorlevel% neq 0 (
    echo [WARN] Seed script returned an error (safe to ignore if data already exists).
)

echo.
echo [5/5] Installing client dependencies...
cd /d "%ROOT%client"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed in client\
    pause & exit /b 1
)
echo [OK] Client dependencies installed.

echo.
echo ============================================
echo   Setup complete!
echo ============================================
echo.
echo   Test accounts ^(password: Password123!^):
echo     Admin:    admin@pulsedesk.dev
echo     Agent:    agent@pulsedesk.dev
echo     Customer: customer@pulsedesk.dev
echo.
echo   Next step: run  start-dev.bat
echo.
cd /d "%ROOT%"
pause
