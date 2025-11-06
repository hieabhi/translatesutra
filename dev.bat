@echo off
REM TranslateSutra Docker Compose Development Helper for Windows
REM This script provides convenient commands for Docker Compose development

setlocal enabledelayedexpansion

REM Check if docker and docker-compose are installed
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

where docker-compose >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo [INFO] Creating .env file from .env.example...
    copy .env.example .env >nul
    echo [SUCCESS] .env file created! Please review and update the configuration.
) else (
    echo [INFO] .env file already exists.
)

REM Main command dispatcher
if "%1"=="setup" goto setup
if "%1"=="up" goto up
if "%1"=="full" goto full
if "%1"=="translation" goto translation
if "%1"=="keycloak" goto keycloak
if "%1"=="cache" goto cache
if "%1"=="down" goto down
if "%1"=="restart" goto restart
if "%1"=="logs" goto logs
if "%1"=="ps" goto ps
if "%1"=="clean" goto clean
if "%1"=="db-migrate" goto db_migrate
if "%1"=="db-seed" goto db_seed
if "%1"=="help" goto help
if "%1"=="--help" goto help
if "%1"=="-h" goto help
if "%1"=="" goto help
goto unknown

:setup
echo [INFO] Setting up TranslateSutra development environment...
echo [INFO] Building backend image...
docker-compose build backend
echo [SUCCESS] Setup complete! You can now run: %0 up
goto end

:up
echo [INFO] Starting basic development stack (postgres + backend + web)...
docker-compose up -d postgres
timeout /t 5 /nobreak >nul
docker-compose up -d backend web
echo [SUCCESS] Development stack is running!
echo [INFO] Services available at:
echo [INFO]   - Web: http://localhost:8081
echo [INFO]   - Backend API: http://localhost:3000
echo [INFO]   - PostgreSQL: localhost:5432
goto end

:full
echo [INFO] Starting full development stack...
docker-compose --profile translation --profile keycloak --profile cache up -d
echo [SUCCESS] Full development stack is running!
echo [INFO] Services available at:
echo [INFO]   - Web: http://localhost:8081
echo [INFO]   - Backend API: http://localhost:3000
echo [INFO]   - PostgreSQL: localhost:5432
echo [INFO]   - LibreTranslate: http://localhost:5000
echo [INFO]   - Keycloak: http://localhost:8080
echo [INFO]   - Redis: localhost:6379
goto end

:translation
echo [INFO] Starting development stack with LibreTranslate...
docker-compose --profile translation up -d
echo [SUCCESS] Development stack with translation is running!
goto end

:keycloak
echo [INFO] Starting development stack with Keycloak...
docker-compose --profile keycloak up -d
echo [SUCCESS] Development stack with Keycloak is running!
goto end

:cache
echo [INFO] Starting development stack with Redis cache...
docker-compose --profile cache up -d
echo [SUCCESS] Development stack with cache is running!
goto end

:down
echo [INFO] Stopping all services...
docker-compose --profile translation --profile keycloak --profile cache down
echo [SUCCESS] All services stopped.
goto end

:restart
echo [INFO] Restarting services...
call :down
timeout /t 2 /nobreak >nul
call :up
goto end

:logs
if "%2"=="" (
    docker-compose logs -f
) else (
    docker-compose logs -f %2
)
goto end

:ps
docker-compose ps
goto end

:clean
echo [WARNING] This will remove all containers, networks, and volumes!
set /p confirm=Are you sure? (y/N): 
if /i "!confirm!"=="y" (
    echo [INFO] Cleaning up...
    docker-compose --profile translation --profile keycloak --profile cache down -v --remove-orphans
    docker system prune -f
    echo [SUCCESS] Cleanup complete!
) else (
    echo [INFO] Cleanup cancelled.
)
goto end

:db_migrate
echo [INFO] Running database migrations...
docker-compose exec backend npm run migrate
echo [SUCCESS] Database migrations completed!
goto end

:db_seed
echo [INFO] Seeding database with sample data...
docker-compose exec backend npm run seed
echo [SUCCESS] Database seeding completed!
goto end

:help
echo TranslateSutra Docker Development Helper
echo.
echo Usage: %0 [COMMAND] [OPTIONS]
echo.
echo Commands:
echo   setup           Setup development environment (create .env)
echo   up              Start basic services (postgres + backend + web)
echo   full            Start all services including translation ^& keycloak
echo   translation     Start with LibreTranslate service
echo   keycloak        Start with Keycloak authentication
echo   cache           Start with Redis cache
echo   down            Stop all services
echo   restart         Restart all services
echo   logs            Show logs for all services
echo   logs [service]  Show logs for specific service
echo   ps              Show running containers
echo   clean           Remove all containers and volumes
echo   db-migrate      Run database migrations
echo   db-seed         Seed database with sample data
echo   help            Show this help message
echo.
echo Examples:
echo   %0 setup                    # Initial setup
echo   %0 up                       # Start basic development stack
echo   %0 full                     # Start full stack with all services
echo   %0 logs backend             # Show backend logs
echo   %0 clean                    # Clean up everything
goto end

:unknown
echo [ERROR] Unknown command: %1
echo.
goto help

:end