param(
  [ValidateSet('start', 'stop', 'status')]
  [string]$Action = 'start'
)

$ErrorActionPreference = 'Stop'

$candidates = @()
if ($env:PG_BIN) { $candidates += (Join-Path $env:PG_BIN 'pg_ctl.exe') }
$onPath = Get-Command pg_ctl.exe -ErrorAction SilentlyContinue
if ($onPath) { $candidates += $onPath.Source }
$candidates += Get-ChildItem 'C:\Program Files\PostgreSQL' -Directory -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending |
  ForEach-Object { Join-Path $_.FullName 'bin\pg_ctl.exe' }

$pgctl = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $pgctl) { throw 'pg_ctl.exe not found. Set PG_BIN to your PostgreSQL bin directory.' }

$dataDir = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\.pgdata')).Path
$logFile = Join-Path $dataDir 'server.log'

switch ($Action) {
  'start' { & $pgctl -D $dataDir -l $logFile -o '-p 5433' -w start }
  'stop' { & $pgctl -D $dataDir -m fast -w stop }
  'status' { & $pgctl -D $dataDir status }
}
