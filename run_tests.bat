@echo off
title WAYFARER AI - Run Tests
cd /d "%~dp0"
echo ===================================================
echo Running Unit Tests & End-to-End Integration Tests
echo ===================================================
npm test
node tests/integration.js
pause
