#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Legendin backend server...');

// Change to the script's directory
process.chdir(__dirname);

// Start the server with node
const serverProcess = spawn('node', ['dist/server.cjs'], {
  stdio: 'pipe',
  env: { ...process.env, NODE_ENV: 'development' }
});

serverProcess.stdout.on('data', (data) => {
  console.log(`[${new Date().toISOString()}] ${data.toString()}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[${new Date().toISOString()}] ${data.toString()}`);
});

serverProcess.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

process.on('SIGINT', () => {
  console.log('\nStopping server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\nStopping server...');
  serverProcess.kill('SIGTERM');
});