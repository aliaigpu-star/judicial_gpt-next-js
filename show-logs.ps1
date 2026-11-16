<#
.SYNOPSIS
    View JudicialGPT agent logs.

USAGE
    .\show-logs.ps1                     # show last 30 lines of all agents
    .\show-logs.ps1 civil-law           # tail one agent live (Ctrl+C to stop)
    .\show-logs.ps1 -All -Lines 50      # last 50 lines of every agent
    .\show-logs.ps1 -Errors             # only lines with ERROR/Exception
#>
param(
    [string]$Agent  = '',
    [int]   $Lines  = 30,
    [switch]$All,
    [switch]$Errors,
    [switch]$Live       # live tail (only with a single agent name)
)

$logDir = Join-Path $PSScriptRoot 'logs'

if (-not (Test-Path $logDir)) {
    Write-Host "No logs folder yet. Run start-agents.ps1 first." -ForegroundColor Yellow
    exit
}

$files = Get-ChildItem $logDir -Filter '*.log' | Sort-Object Name

if (-not $files) {
    Write-Host "No log files in $logDir yet." -ForegroundColor Yellow
    exit
}

# Single agent live tail
if ($Agent -and $Live) {
    $f = Join-Path $logDir "$Agent.log"
    if (-not (Test-Path $f)) { Write-Host "No log for '$Agent'" -ForegroundColor Red; exit }
    Write-Host "=== Live tail: $Agent (Ctrl+C to stop) ===" -ForegroundColor Cyan
    Get-Content $f -Wait -Tail $Lines
    exit
}

# Single agent last N lines
if ($Agent) {
    $f = Join-Path $logDir "$Agent.log"
    if (-not (Test-Path $f)) { Write-Host "No log for '$Agent'" -ForegroundColor Red; exit }
    $content = Get-Content $f -Tail $Lines
    if ($Errors) { $content = $content | Where-Object { $_ -match 'ERROR|Exception|Traceback|error' } }
    Write-Host "=== $Agent (last $Lines lines) ===" -ForegroundColor Cyan
    $content | ForEach-Object {
        if ($_ -match 'ERROR|Exception|Traceback')  { Write-Host $_ -ForegroundColor Red }
        elseif ($_ -match 'WARNING|WARN')            { Write-Host $_ -ForegroundColor Yellow }
        elseif ($_ -match 'Started|startup complete'){ Write-Host $_ -ForegroundColor Green }
        else                                          { Write-Host $_ }
    }
    exit
}

# All agents
foreach ($f in $files) {
    $name = $f.BaseName
    Write-Host ""
    Write-Host "┌─── $name ─────────────────────────────" -ForegroundColor Cyan
    $content = Get-Content $f.FullName -Tail $Lines
    if ($Errors) { $content = $content | Where-Object { $_ -match 'ERROR|Exception|Traceback|error' } }
    if (-not $content) { Write-Host "│  (no output yet)" -ForegroundColor DarkGray; continue }
    $content | ForEach-Object {
        if ($_ -match 'ERROR|Exception|Traceback')  { Write-Host "│  $_" -ForegroundColor Red }
        elseif ($_ -match 'WARNING|WARN')            { Write-Host "│  $_" -ForegroundColor Yellow }
        elseif ($_ -match 'Started|startup complete'){ Write-Host "│  $_" -ForegroundColor Green }
        else                                          { Write-Host "│  $_" }
    }
}
Write-Host ""
Write-Host "Logs folder: $logDir" -ForegroundColor DarkGray
Write-Host "Tips:" -ForegroundColor DarkGray
Write-Host "  .\show-logs.ps1 civil-law -Live     # live tail one agent" -ForegroundColor DarkGray
Write-Host "  .\show-logs.ps1 -Errors             # only errors from all agents" -ForegroundColor DarkGray
