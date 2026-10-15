<#
.SYNOPSIS
    Starts the JudicialGPT Python agents, each in its own PowerShell window.

.EXAMPLE
    .\start-agents.ps1                      # start all 7 agents
    .\start-agents.ps1 -Only civil-law,search   # start just these
    .\start-agents.ps1 -DryRun              # show what would start, run nothing
    .\start-agents.ps1 -Force               # start even if Vault is sealed

Agent names: search, summarizer, civil-writer, criminal-writer,
             civil-law, criminal-law, family-law
#>
param(
    [string[]]$Only,
    [switch]$DryRun,
    [switch]$Force      # start even if Vault is still sealed
)

$root = $PSScriptRoot

# Name, folder, uvicorn app, port (ports match the ngrok tunnels in ngrok.yml).
$agents = @(
    @{ Name = 'search';          Folder = 'judgement_searching_agent';        App = 'main:app';         Port = 7001 },
    @{ Name = 'summarizer';      Folder = 'Summerization_Agent';              App = 'api:app';          Port = 7002 },
    @{ Name = 'civil-writer';    Folder = 'Civil Judgement Writing Agent';    App = 'api:app';          Port = 7003 },
    @{ Name = 'criminal-writer'; Folder = 'Criminal Judgement Writing Agent'; App = 'criminal_api:app'; Port = 7004 },
    @{ Name = 'civil-law';       Folder = 'Civil Law Agent';                  App = 'api:app';          Port = 7005 },
    @{ Name = 'criminal-law';    Folder = 'Criminal Law Agent';               App = 'api_criminal:app'; Port = 7006 },
    @{ Name = 'family-law';      Folder = 'Family Law Agent';                 App = 'api_family:app';   Port = 7007 }
)

if ($Only) {
    $unknown = $Only | Where-Object { $_ -notin $agents.Name }
    if ($unknown) {
        Write-Host "Unknown agent(s): $($unknown -join ', ')" -ForegroundColor Red
        Write-Host "Valid names: $($agents.Name -join ', ')"
        exit 1
    }
    $agents = $agents | Where-Object { $_.Name -in $Only }
}

# Vault starts sealed after every reboot, and agents that read their keys from it
# exit at startup (leaving their window open) until it is unsealed. The keys are
# saved once with .\setup-vault-unseal.ps1, so this normally needs no typing.
if (-not $DryRun) {
    $unsealed = $false
    try {
        . (Join-Path $PSScriptRoot 'vault-helpers.ps1')
        $unsealed = Unlock-Vault
    } catch {
        Write-Host "Could not check Vault: $($_.Exception.Message)" -ForegroundColor Red
    }

    if ($unsealed) {
        Write-Host 'Vault is unsealed.' -ForegroundColor Green
    } elseif ($Force) {
        Write-Host 'Vault is not unsealed - starting anyway (-Force).' -ForegroundColor Yellow
    } else {
        Write-Host 'Vault is not unsealed, so the agents would exit at startup. Nothing was started.' -ForegroundColor Red
        Write-Host 'Unseal it and run this again (or use -Force to start anyway).'
        exit 1
    }
}

$pidFile = Join-Path $env:TEMP 'judicialgpt-agents.pids'
$started = @()

foreach ($agent in $agents) {
    $dir = Join-Path $root $agent.Folder
    $label = '{0} (:{1})' -f $agent.Name, $agent.Port
    $command = "uvicorn $($agent.App) --host 0.0.0.0 --port $($agent.Port) --reload"

    if (-not (Test-Path $dir)) {
        Write-Host "SKIP   $label - folder not found: $($agent.Folder)" -ForegroundColor Red
        continue
    }
    if (Get-NetTCPConnection -LocalPort $agent.Port -State Listen -ErrorAction SilentlyContinue) {
        Write-Host "SKIP   $label - port $($agent.Port) is already in use (agent already running?)" -ForegroundColor Yellow
        continue
    }
    if ($DryRun) {
        Write-Host "WOULD  $label  in '$($agent.Folder)':  $command"
        continue
    }

    $window = "`$host.UI.RawUI.WindowTitle = 'JudicialGPT - $label'; $command"
    $process = Start-Process powershell -WorkingDirectory $dir -PassThru `
        -ArgumentList '-NoExit', '-NoProfile', '-Command', $window
    $started += $process.Id
    Write-Host "START  $label  (window PID $($process.Id))" -ForegroundColor Green
}

if ($started) {
    $started | Set-Content $pidFile
    Write-Host "`nStarted $($started.Count) agent window(s). Stop them all with .\stop-agents.ps1" -ForegroundColor Cyan
}
