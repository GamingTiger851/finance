Write-Host "Starting FinTracker API and web application..." -ForegroundColor Green
Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $PSScriptRoot -WindowStyle Minimized
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173/"
Set-Location -Path (Join-Path $PSScriptRoot "frontend")
npm run dev
