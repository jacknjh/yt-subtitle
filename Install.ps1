#Requires -Version 5.1
[CmdletBinding(SupportsShouldProcess = $true)]
param([string]$TemplatePath, [string]$PremierePath)
$ErrorActionPreference = 'Stop'
try {
    & (Join-Path $PSScriptRoot 'prototype/cep/install-dev.ps1') -InstallReader -Interactive -TemplatePath $TemplatePath -PremierePath $PremierePath -WhatIf:$WhatIfPreference
} catch {
    Write-Host ("Installation failed: " + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
