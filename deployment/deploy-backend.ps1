# Backend Deployment Script
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Deploying Backend to Cloudflare" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

Set-Location ..\backend

Write-Host ""
Write-Host "[1/4] Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "[2/4] Running migrations..." -ForegroundColor Yellow
wrangler d1 execute client-database --file=./migrations/0001_initial_schema.sql

Write-Host ""
Write-Host "[3/4] Deploying Worker..." -ForegroundColor Yellow
wrangler deploy

Write-Host ""
Write-Host "[4/4] Testing deployment..." -ForegroundColor Yellow
$workerUrl = Read-Host "Enter your Worker URL (e.g., https://client-database-api.your-subdomain.workers.dev)"

try {
    $response = Invoke-RestMethod -Uri "$workerUrl/" -Method Get
    Write-Host "Success: Backend is live!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Gray
}
catch {
    Write-Host "Error: Failed to reach backend" -ForegroundColor Red
    Write-Host "Details: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Backend Deployment Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Worker URL: $workerUrl" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the API endpoints" -ForegroundColor White
Write-Host "2. Update frontend .env.production with Worker URL" -ForegroundColor White
Write-Host "3. Deploy frontend with: deploy-frontend.ps1" -ForegroundColor White