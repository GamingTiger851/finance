@echo off
start "FinTracker API" cmd /k "cd /d %~dp0 && npm start"
timeout /t 2 /nobreak >nul
cd /d "%~dp0frontend"
echo ========================================================
echo Starting FinTracker AI Web Application...
echo Developed by:  HAWKS Intelligence
echo Opening http://localhost:5173/ in your browser...
echo ========================================================
start "" "http://localhost:5173/"
npm run dev
pause
