/**
 * Dev-only guard: remove stale FaceHR dev processes before starting.
 *
 * A crashed/duplicate nodemon stays alive in "waiting for file changes" mode and
 * re-binds port 5000 on the next save, which produces the confusing
 * `EADDRINUSE` crash. This script stops those leftovers (never its own parent
 * process tree) so `npm run dev` always starts one clean instance.
 */
const { execFileSync } = require('child_process');

const DEV_PORTS = [Number(process.env.PORT) || 5000, 5173];

const WIN_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$ancestors = @{}
$current = ${process.pid}
while ($current -and -not $ancestors.ContainsKey([int]$current)) {
  $ancestors[[int]$current] = $true
  $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$current"
  if (-not $proc) { break }
  $current = [int]$proc.ParentProcessId
}
$targets = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {
  -not $ancestors.ContainsKey([int]$_.ProcessId) -and
  $_.CommandLine -match 'facehr|nodemon|vite|concurrently|run dev|server\\.js'
}
foreach ($t in $targets) {
  Write-Host ("[dev] stopping stale FaceHR process " + $t.ProcessId)
  Stop-Process -Id $t.ProcessId -Force
}
foreach ($port in 5000, 5173) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen
  if ($conn -and -not $ancestors.ContainsKey([int]$conn.OwningProcess)) {
    Write-Host ("[dev] freeing port " + $port)
    Stop-Process -Id $conn.OwningProcess -Force
  }
}
Start-Sleep -Milliseconds 800
`;

async function clean() {
  if (process.platform === 'win32') {
    execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', WIN_SCRIPT], {
      stdio: 'inherit',
      windowsHide: true,
    });
    return;
  }

  for (const port of DEV_PORTS) {
    try {
      execFileSync('bash', ['-lc', `fuser -k ${port}/tcp 2>/dev/null || lsof -ti tcp:${port} | xargs -r kill -9 2>/dev/null || true`], {
        stdio: 'inherit',
      });
    } catch {
      /* nothing listening */
    }
  }
}

clean().catch(() => process.exit(0));
