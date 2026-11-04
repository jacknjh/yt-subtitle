#Requires -Version 5.1
param([string]$OutputDirectory = (Join-Path $PSScriptRoot '../dist'))
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$version = (Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
if ($version -notmatch '^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$') { throw 'package.json needs a valid release version.' }
$files = @('Install.cmd','Install.ps1','package.json','prototype/install-reader.ps1','prototype/manifest.json','prototype/index.html','prototype/main.js','prototype/probe.js','prototype/reader.js','prototype/identity.js','prototype/cep/install-dev.ps1','prototype/cep/installation.ps1','prototype/cep/index.html','prototype/cep/main.js','prototype/cep/planner.js','prototype/cep/appearance.js','prototype/cep/layout.js','prototype/cep/scrub.js','prototype/cep/history.js','prototype/cep/sessions.js','prototype/cep/font-data.js','prototype/cep/scan-fonts.cjs','prototype/cep/host.jsx','prototype/cep/bridge.jsx','prototype/cep/CSXS/manifest.xml','prototype/cep/vendor/json2.js','prototype/cep/vendor/README.md')
foreach ($file in $files + @('INSTALL.md')) {
    if (-not (Test-Path -LiteralPath (Join-Path $root $file) -PathType Leaf)) { throw "Release source missing: $file" }
}
$output = [IO.Path]::GetFullPath($OutputDirectory)
$archivePath = Join-Path $output "subtitle-generator-$version-windows.zip"
if (Test-Path -LiteralPath $archivePath) { throw "Release already exists: $archivePath. Use a new version or output directory." }
New-Item -ItemType Directory -Path $output -Force | Out-Null
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::Open($archivePath, [IO.Compression.ZipArchiveMode]::Create)
$failure = $null
try {
    foreach ($file in $files) { [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $root $file), $file, [IO.Compression.CompressionLevel]::Optimal) | Out-Null }
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $root 'INSTALL.md'), 'README.md', [IO.Compression.CompressionLevel]::Optimal) | Out-Null
} catch { $failure = $_ }
finally { $archive.Dispose() }
if ($failure) { Remove-Item -LiteralPath $archivePath; throw $failure }
$stream = [IO.File]::OpenRead($archivePath)
$hasher = [Security.Cryptography.SHA256]::Create()
try { $hash = [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() }
finally { $stream.Dispose(); $hasher.Dispose() }
Set-Content -LiteralPath ($archivePath + '.sha256') -Encoding ascii -Value ($hash + '  ' + (Split-Path -Leaf $archivePath))
Write-Output "Release package: $archivePath"
Write-Output "SHA-256: $hash"
Write-Output 'Package contains no MOGRT, user data, generated config or debugging listener. A compatible template is required separately.'
