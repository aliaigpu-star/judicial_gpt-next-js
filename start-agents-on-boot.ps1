<#
.SYNOPSIS
    Waits for internet, then starts all JudicialGPT agents.
    Meant to be called by Windows Task Scheduler at logon.
#>

$logFile = Join-Path $env:TEMP 'judicialgpt-startup.log'
$root    = $PSScriptRoot

function Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
    Add-Content -Path $logFile -Value $line
    Write-Host $line
}

Log "=== JudicialGPT startup triggered ==="

# Wait for internet (up to 3 minutes, check every 5 seconds)
Log "Waiting for internet connection..."
$maxWait  = 180   # seconds
$interval = 5
$elapsed  = 0
$online   = $false

while ($elapsed -lt $maxWait) {
    try {
        $null = [System.Net.Dns]::GetHostEntry('google.com')
        $online = $true
        break
    } catch {
        Start-Sleep -Seconds $interval
        $elapsed += $interval
    }
}

if ($online) {
    Log "Internet connected after ${elapsed}s. Starting agents..."
} else {
    Log "No internet after ${maxWait}s. Starting agents anyway (ngrok tunnels may fail)..."
}

# Give the system a few more seconds to fully settle
Start-Sleep -Seconds 5

# Run the main start script
$script = Join-Path $root 'start-agents.ps1'
if (-not (Test-Path $script)) {
    Log "ERROR: start-agents.ps1 not found at $script"
    exit 1
}

Log "Launching start-agents.ps1 ..."
& powershell -NoProfile -ExecutionPolicy Bypass -File $script
Log "start-agents.ps1 finished."
