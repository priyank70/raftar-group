@echo off
echo ==========================================
echo   Raftar Group - Digital Mandal System
echo ==========================================
echo.

echo Starting Backend Server...
start "Raftar Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "Raftar Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ==========================================
echo   App is starting up!
echo   Frontend: http://localhost:3000
echo   Backend API: http://localhost:5000
echo.
echo   Admin: admin@raftar.com / Admin@123
echo   Member: rahul@raftar.com / Member@123
echo ==========================================
echo.
echo Both servers are running in separate windows.
pause
