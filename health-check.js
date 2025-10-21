#!/usr/bin/env node

// Simple health check script for Render
// This script can be used as a health check endpoint

const http = require('http');

// Get port from environment variable or default to 3000
const port = process.env.PORT || 3000;

// Create a simple HTTP server for health checks
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'reachinbox-onebox-ai'
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Not Found',
      timestamp: new Date().toISOString()
    }));
  }
});

server.listen(port, () => {
  console.log(`Health check server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down health check server');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down health check server');
  server.close(() => {
    process.exit(0);
  });
});