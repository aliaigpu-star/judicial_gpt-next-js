<#
.SYNOPSIS
    One-time setup: saves 3 Vault unseal keys, encrypted for your Windows account,
    so start-agents.ps1 can unseal Vault automatically after every reboot.

.EXAMPLE
    .\setup-vault-unseal.ps1            # asks for the keys (hidden input)
    .\setup-vault-unseal.ps1 -Remove    # forget the saved keys
#>
param(
    [string[]]$Keys,
    [switch]$Remove
)

. "$PSScriptRoot\vault-helpers.ps1"

if ($Remove) {
    if (Test-Path $script:UnsealKeyFile) { Remove-Item $script:UnsealKeyFile; Write-Host 'Saved unseal keys removed.' }
    else { Write-Host 'No saved unseal keys.' }
    exit 0
}

if (-not $Keys) {
    Write-Host 'Enter 3 different unseal keys (input is hidden). A key pasted with its label is fine.'
    $Keys = 1..3 | ForEach-Object {
        $secure = Read-Host "  Unseal key $_" -AsSecureString
        [System.Net.NetworkCredential]::new('', $secure).Password
    }
}

$Keys = @($Keys | ForEach-Object { Format-UnsealKey $_ } | Where-Object { $_ })
if ($Keys.Count -lt 3) {
    Write-Host 'Three unseal keys are needed.' -ForegroundColor Red
    exit 1
}

Save-UnsealKeys $Keys[0..2]
Write-Host "Saved 3 unseal keys (encrypted for $env:USERNAME on this PC):" -ForegroundColor Green
Write-Host "  $script:UnsealKeyFile"
