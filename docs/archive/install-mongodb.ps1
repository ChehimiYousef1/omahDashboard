# Downloads and sets up MongoDB Community (portable) for local development.
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$mongoDir = Join-Path $root "mongodb"
$dataDir = Join-Path $root "mongodb-data"
$logDir = Join-Path $root "mongodb-logs"
$version = "7.0.14"
$zipName = "mongodb-windows-x86_64-$version.zip"
$downloadUrl = "https://fastdl.mongodb.org/windows/$zipName"
$zipPath = Join-Path $env:TEMP $zipName

if (Test-Path (Join-Path $mongoDir "bin\mongod.exe")) {
  Write-Host "MongoDB already installed at $mongoDir"
  exit 0
}

Write-Host "Downloading MongoDB Community $version..."
Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing

Write-Host "Extracting MongoDB..."
New-Item -ItemType Directory -Force -Path $mongoDir | Out-Null
Expand-Archive -Path $zipPath -DestinationPath $mongoDir -Force

$extracted = Get-ChildItem -Path $mongoDir -Directory | Where-Object { $_.Name -like "mongodb-*" } | Select-Object -First 1
if ($extracted) {
  Get-ChildItem -Path $extracted.FullName | Move-Item -Destination $mongoDir -Force
  Remove-Item $extracted.FullName -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
Write-Host "MongoDB installed successfully at $mongoDir"
Write-Host "Run: npm run mongodb"
