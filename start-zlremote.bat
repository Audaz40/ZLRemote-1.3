@echo off
echo 🚀 Starting ZLRemote...

echo Starting server...
start /B cmd /c "cd server && npm start"

timeout /t 3 /nobreak >nul

echo Starting web application...
start /B cmd /c "cd web && npm start"

echo.
echo ✅ ZLRemote is running!
echo 📱 Web App: http://localhost:3000
echo 🖥️ Desktop App: Run 'cd desktop && npm start' in another terminal
echo.
echo Press any key to stop all services...
pause >nul

taskkill /f /im node.exe 2>nul
echo 🛑 ZLRemote stopped.