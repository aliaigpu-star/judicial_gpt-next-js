<#
.SYNOPSIS
    Registers (or updates) the Windows Task Scheduler task that auto-starts
    JudicialGPT agents at logon.

    Run ONCE as Administrator:
        powershell -ExecutionPolicy Bypass -File .\setup-startup-task.ps1

    To remove the task later:
        Unregister-ScheduledTask -TaskName 'JudicialGPT-Agents' -Confirm:$false
#>

$taskName   = 'JudicialGPT-Agents'
$scriptPath = Join-Path $PSScriptRoot 'start-agents-on-boot.ps1'

if (-not (Test-Path $scriptPath)) {
    Write-Host "ERROR: $scriptPath not found." -ForegroundColor Red
    exit 1
}

# Remove old task if it exists
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Removed old task." -ForegroundColor Yellow
}

# Action: run the boot wrapper script in a visible PowerShell window
$action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File `"$scriptPath`""

# Trigger: at logon of the current user
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

# Settings: allow running even on battery, don't stop on idle
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -MultipleInstances IgnoreNew `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable

# Principal: run as current user (interactive, so windows can open)
$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName  $taskName `
    -Action    $action `
    -Trigger   $trigger `
    -Settings  $settings `
    -Principal $principal `
    -Description 'Auto-start JudicialGPT Python agents at logon' | Out-Null

Write-Host ""
Write-Host "Task '$taskName' registered successfully." -ForegroundColor Green
Write-Host "It will run start-agents-on-boot.ps1 every time you log in."
Write-Host ""
Write-Host "To verify:  Get-ScheduledTask -TaskName '$taskName'"
Write-Host "To test now: Start-ScheduledTask -TaskName '$taskName'"
Write-Host "To remove:  Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"
