<#
.SYNOPSIS
    Stops every agent window started by start-agents.ps1 (and its uvicorn processes).
#>
$pidFile = Join-Path $env:TEMP 'judicialgpt-agents.pids'

if (-not (Test-Path $pidFile)) {
    Write-Host 'No agents recorded as started by start-agents.ps1.' -ForegroundColor Yellow
    exit 0
}

foreach ($windowPid in Get-Content $pidFile) {
    # /T also ends the uvicorn reloader and its worker, not just the window.
    taskkill /PID $windowPid /T /F 2>$null | Out-Null
    Write-Host "Stopped window PID $windowPid"
}
Remove-Item $pidFile
