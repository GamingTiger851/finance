$env:PATH = "D:\FintrackerAI\node;$env:PATH"
Set-Location -Path "$PSScriptRoot\frontend"
Write-Host "Starting FinTracker AI Web Application (Team HAWKS Intelligence)..." -ForegroundColor Green
Start-Process "http://localhost:5173/"
npm run dev
