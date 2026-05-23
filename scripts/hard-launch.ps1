$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path $PSScriptRoot -Parent

function Stop-Port($port) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped port $port (PID $($c.OwningProcess))"
  }
}

Write-Host "=== FraudShield hard launch ===" -ForegroundColor Cyan
foreach ($p in @(3002, 5000, 8000, 8080)) { Stop-Port $p }
Start-Sleep -Seconds 2

$env:NODE_ENV = "development"

Start-Process powershell -WindowStyle Minimized -ArgumentList @(
  "-NoExit", "-Command",
  "Set-Location '$root\services\inference-fastapi'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
)

Start-Process powershell -WindowStyle Minimized -ArgumentList @(
  "-NoExit", "-Command",
  "Set-Location '$root\backend'; `$env:NODE_ENV='development'; `$env:INFERENCE_URL='http://localhost:8000'; npm start"
)

if (Test-Path "$root\apps\api-gateway\package.json") {
  if (-not (Test-Path "$root\apps\api-gateway\node_modules")) {
    Set-Location "$root\apps\api-gateway"; npm install --legacy-peer-deps 2>$null
  }
  Start-Process powershell -WindowStyle Minimized -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$root\apps\api-gateway'; `$env:BACKEND_URL='http://localhost:5000'; npm start"
  )
}

Start-Process powershell -WindowStyle Minimized -ArgumentList @(
  "-NoExit", "-Command",
  "Set-Location '$root\frontend'; npm run dev"
)

Write-Host "Waiting for services..." -ForegroundColor Yellow
Start-Sleep -Seconds 12

Write-Host "`nHealth checks:" -ForegroundColor Cyan
try { Invoke-RestMethod "http://localhost:8000/health" | Out-Null; Write-Host "  Inference :8000 OK" -ForegroundColor Green } catch { Write-Host "  Inference :8000 FAIL" -ForegroundColor Red }
try { Invoke-RestMethod "http://localhost:5000/api/health" | Out-Null; Write-Host "  Backend   :5000 OK" -ForegroundColor Green } catch { Write-Host "  Backend   :5000 FAIL" -ForegroundColor Red }
try { Invoke-RestMethod "http://localhost:8080/health" | Out-Null; Write-Host "  Gateway   :8080 OK" -ForegroundColor Green } catch { Write-Host "  Gateway   :8080 SKIP" -ForegroundColor Yellow }
try { (Invoke-WebRequest "http://localhost:3002/" -UseBasicParsing).StatusCode | Out-Null; Write-Host "  Frontend  :3002 OK" -ForegroundColor Green } catch { Write-Host "  Frontend  :3002 FAIL" -ForegroundColor Red }

Write-Host "`nOpen http://localhost:3002" -ForegroundColor Green
