@echo off
REM Script to start all services using Docker Compose

echo Starting ReachInbox Onebox AI services...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running. Please start Docker first.
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo Warning: .env file not found. Please create one from .env.example
    echo Copying .env.example to .env
    copy .env.example .env
    echo Please update the .env file with your configuration before starting services
)

REM Start services
echo Starting services with Docker Compose...
docker-compose up -d

REM Check if services started successfully
if %errorlevel% equ 0 (
    echo Services started successfully!
    echo Access the application at http://localhost:3000
    echo View logs with: docker-compose logs -f
) else (
    echo Error: Failed to start services
    exit /b 1
)