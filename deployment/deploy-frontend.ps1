# Frontend Deployment Script
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Deploying Frontend to Cloudflare Pages" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

Set-Location ..\frontend

Write-Host ""
Write-Host "[1/4] Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "[2/4] Building production bundle..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "[3/4] Deploying to Cloudflare Pages..." -ForegroundColor Yellow
Write-Host "Note: You may need to create a Pages project first" -ForegroundColor Gray

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=client-database

Write-Host ""
Write-Host "[4/4] Deployment complete!" -ForegroundColor Green

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Frontend Deployment Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your app should be available at:" -ForegroundColor Yellow
Write-Host "https://client-database.pages.dev" -ForegroundColor White
Write-Host ""
Write-Host "Default login credentials:" -ForegroundColor Yellow
Write-Host "Username: admin" -ForegroundColor White
Write-Host "Password: Admin@123" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Change the default password immediately!" -ForegroundColor Red