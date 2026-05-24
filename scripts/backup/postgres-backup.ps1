param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$OutputDir = ".\backups"
)

if (-not $DatabaseUrl) {
  Write-Error "DATABASE_URL is required"
  exit 1
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = Join-Path $OutputDir "fraudshield-$timestamp.sql"

Write-Host "Backing up Postgres to $outputFile"
docker run --rm -e PGPASSWORD=postgres postgres:16-alpine `
  pg_dump $DatabaseUrl.Replace("postgresql://", "postgres://") `
  -f /tmp/backup.sql 2>$null

if ($LASTEXITCODE -ne 0) {
  pg_dump $DatabaseUrl -f $outputFile
} else {
  docker cp "$(docker ps -lq):/tmp/backup.sql" $outputFile
}

Write-Host "Backup complete: $outputFile"
