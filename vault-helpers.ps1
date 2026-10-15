# Shared Vault helpers for start-agents.ps1 and setup-vault-unseal.ps1.
# Talks to Vault's HTTP API directly, so it needs neither vault.exe nor a terminal.

$script:VaultAddr = if ($env:VAULT_ADDR) { $env:VAULT_ADDR } else { 'http://127.0.0.1:8200' }

# Unseal keys are stored encrypted with Windows DPAPI: only this Windows user, on this
# PC, can decrypt the file. It lives outside the project folder, so it is never committed.
$script:UnsealKeyFile = Join-Path $env:LOCALAPPDATA 'JudicialGPT\vault-unseal.keys'

function Format-UnsealKey([string]$Text) {
    # Accept a key pasted with its label ("Unseal Key 1: hL2C...") or stray spaces.
    ($Text -replace '(?i)^\s*unseal key\s*\d*\s*:\s*', '') -replace '\s', ''
}

function Get-VaultSealed {
    # $true / $false, or $null when Vault cannot be reached.
    try { (Invoke-RestMethod "$script:VaultAddr/v1/sys/seal-status" -TimeoutSec 5).sealed } catch { $null }
}

function Submit-UnsealKey([string]$Key) {
    # Returns the sealed state after the key was submitted, or $null if Vault rejected it.
    try {
        $body = @{ key = $Key } | ConvertTo-Json
        (Invoke-RestMethod "$script:VaultAddr/v1/sys/unseal" -Method Put -Body $body `
            -ContentType 'application/json' -TimeoutSec 10).sealed
    } catch {
        Write-Host "  Vault rejected that key." -ForegroundColor Red
        $null
    }
}

function Save-UnsealKeys([string[]]$Keys) {
    $dir = Split-Path $script:UnsealKeyFile
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    $Keys | ForEach-Object {
        ConvertTo-SecureString (Format-UnsealKey $_) -AsPlainText -Force | ConvertFrom-SecureString
    } | Set-Content $script:UnsealKeyFile
}

function Get-SavedUnsealKeys {
    if (-not (Test-Path $script:UnsealKeyFile)) { return @() }
    try {
        Get-Content $script:UnsealKeyFile | Where-Object { $_ } | ForEach-Object {
            [System.Net.NetworkCredential]::new('', (ConvertTo-SecureString $_)).Password
        }
    } catch {
        Write-Host 'Saved unseal keys could not be read (different Windows user?). Run .\setup-vault-unseal.ps1 again.' -ForegroundColor Yellow
        @()
    }
}

function Unlock-Vault {
    # Unseals Vault using the saved keys, or by asking for them. Returns $true when unsealed.
    $sealed = Get-VaultSealed
    if ($null -eq $sealed) {
        Write-Host "Vault is not reachable at $script:VaultAddr (is the Vault service running?)." -ForegroundColor Yellow
        return $false
    }
    if (-not $sealed) { return $true }

    $keys = @(Get-SavedUnsealKeys)
    if ($keys.Count -gt 0) {
        Write-Host 'Vault is sealed. Unsealing with the saved keys...' -ForegroundColor Yellow
        foreach ($key in $keys) {
            $sealed = Submit-UnsealKey $key
            if ($sealed -eq $false) { break }
        }
    } else {
        Write-Host 'Vault is sealed and no keys are saved (run .\setup-vault-unseal.ps1 once to save them).' -ForegroundColor Yellow
        Write-Host 'Enter 3 different unseal keys now (input is hidden, nothing is saved):'
        for ($i = 1; $i -le 3 -and $sealed; $i++) {
            $secure = Read-Host "  Unseal key $i" -AsSecureString
            $plain = [System.Net.NetworkCredential]::new('', $secure).Password
            $sealed = Submit-UnsealKey (Format-UnsealKey $plain)
        }
    }
    return ($sealed -eq $false)
}
