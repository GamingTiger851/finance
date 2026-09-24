@echo off
set "PATH=D:\FintrackerAI\node;%PATH%"
cd /d "%~dp0frontend"
echo ========================================================
echo Starting FinTracker AI Web Application...
echo Developed by: Team HAWKS Intelligence
echo Opening http://localhost:5173/ in your browser...
echo ========================================================
start "" "http://localhost:5173/"
npm run dev
pause
