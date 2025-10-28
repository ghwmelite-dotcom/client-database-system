Write-Host "Creating frontend file structure..." -ForegroundColor Cyan

# Create directories
$directories = @(
    "src/components",
    "src/context",
    "src/pages",
    "src/services",
    "src/utils"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✓ Created: $dir" -ForegroundColor Green
    }
}

Write-Host "`nAll directories created!" -ForegroundColor Green
Write-Host "Now paste the file contents into each file..." -ForegroundColor Yellow