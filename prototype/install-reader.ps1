param([switch]$PackageOnly)
$ErrorActionPreference = 'Stop'
$readerInstaller = Join-Path $env:CommonProgramFiles 'Adobe/Adobe Desktop Common/RemoteComponents/UPI/UnifiedPluginInstallerAgent/UnifiedPluginInstallerAgent.exe'
if (-not $PackageOnly -and -not (Test-Path -LiteralPath $readerInstaller)) { throw 'Adobe Unified Plugin Installer Agent is missing. Install Creative Cloud Desktop to install the transcript reader.' }
$readerManifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'manifest.json') -Raw | ConvertFrom-Json
if (-not $PackageOnly) {
    Push-Location (Split-Path -Parent $readerInstaller)
    try { $installed = & $readerInstaller /list all 2>&1 }
    finally { Pop-Location }
    $installedPattern = 'Enabled\s+' + [regex]::Escape($readerManifest.name) + '\s+' + [regex]::Escape($readerManifest.version) + '\s*$'
    if ($installed | Where-Object { $_ -match $installedPattern }) { Write-Output "Transcript reader $($readerManifest.version) is already installed."; return }
}
$packageFolder = Join-Path $env:LOCALAPPDATA 'YTSubtitleGenerator/reader-packages'
New-Item -ItemType Directory -Path $packageFolder -Force | Out-Null
$packagePath = Join-Path $packageFolder ('subtitle-reader-' + [DateTime]::UtcNow.Ticks + '.ccx')
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archiveFile = [System.IO.File]::Open($packagePath, [System.IO.FileMode]::CreateNew)
$archive = [System.IO.Compression.ZipArchive]::new($archiveFile, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($name in @('manifest.json', 'index.html', 'main.js', 'probe.js', 'reader.js', 'identity.js')) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $PSScriptRoot $name), $name) | Out-Null
    }
} finally { $archive.Dispose(); $archiveFile.Dispose() }
Write-Output "Reader package: $packagePath"
if (-not $PackageOnly) {
    Push-Location (Split-Path -Parent $readerInstaller)
    try { $installOutput = & $readerInstaller /install $packagePath 2>&1; $installerExit = $LASTEXITCODE }
    finally { Pop-Location }
    $installOutput | Write-Output
    if ($installerExit -ne 0 -or ($installOutput -join "`n") -match 'Failed to install|status\s*=\s*-\d+') { throw "Reader installation failed: $($installOutput -join ' ')" }
    Write-Output 'Transcript reader installed. Premiere starts the reader automatically on launch.'
}
