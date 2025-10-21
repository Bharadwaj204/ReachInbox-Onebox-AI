#!/bin/bash

# Script to start all services using Docker Compose

echo "Starting ReachInbox Onebox AI services..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Warning: .env file not found. Please create one from .env.example"
    echo "Copying .env.example to .env"
    cp .env.example .env
    echo "Please update the .env file with your configuration before starting services"
fi

# Start services
echo "Starting services with Docker Compose..."
docker-compose up -d

# Check if services started successfully
if [ $? -eq 0 ]; then
    echo "Services started successfully!"
    echo "Access the application at http://localhost:3000"
    echo "View logs with: docker-compose logs -f"
else
    echo "Error: Failed to start services"
    exit 1
fi