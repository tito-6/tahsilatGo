@echo off
echo Starting Tahsilat Raporu Application...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && go run main.go"

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Frontend Development Server...
start "Frontend Server" cmd /k "cd frontend && npm start"

echo.
echo Both servers are starting...
echo Backend: http://localhost:8080
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause > nul
