@echo off
title MailDash - Django + React + MongoDB
color 0A
echo ============================================
echo    MailDash Project Launcher
echo    Django + React + MongoDB Atlas
echo ============================================
echo.

echo [1/2] Starting Django Backend on port 8000...
start "Django Backend" cmd /k "cd /d C:\Users\HP\Desktop\Django\Django Project && python manage.py runserver 8000"

echo [2/2] Starting React Frontend on port 5173...
timeout /t 3 /nobreak >nul
start "React Frontend" cmd /k "cd /d C:\Users\HP\Desktop\Django\Django Project\frontend && npm run dev"

echo.
echo ============================================
echo   Both servers are starting!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo ============================================
echo.
timeout /t 5 /nobreak >nul
start http://localhost:5173
echo Browser opened! You can close this window.
pause
