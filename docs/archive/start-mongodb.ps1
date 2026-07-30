$root = Split-Path -Parent $PSScriptRoot
$mongod = Join-Path $root "mongodb\bin\mongod.exe"
$dataDir = Join-Path $root "mongodb-data"
$logDir = Join-Path $root "mongodb-logs"

if (-not (Test-Path $mongod)) {
  Write-Error "MongoDB not found. Run: npm run install:mongodb"
  exit 1
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

Write-Host "Starting MongoDB on mongodb://localhost:27017 ..."
& $mongod --dbpath $dataDir --logpath (Join-Path $logDir "mongod.log") --bind_ip 127.0.0.1 --port 27017
