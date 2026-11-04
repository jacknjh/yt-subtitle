[CmdletBinding(SupportsShouldProcess = $true)]
param([switch]$InstallReader, [string]$TemplatePath, [string]$PremierePath, [switch]$Interactive, [switch]$EnableDebugging)
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'This installer supports Windows only.' }
. (Join-Path $PSScriptRoot 'installation.ps1')
$extensionRoot = Join-Path $env:APPDATA 'Adobe/CEP/extensions'
$installPath = Join-Path $extensionRoot 'YTSubtitleProof'
$templatePath = Resolve-SubtitleTemplate -TemplatePath $TemplatePath -ExistingConfigPath (Join-Path $installPath 'config.js')
if (-not $templatePath -and $Interactive) { $templatePath = Resolve-SubtitleTemplate -TemplatePath (Select-SubtitleInstallFile 'Choose your compatible subtitle MOGRT' 'Motion Graphics Template (*.mogrt)|*.mogrt') }
if (-not $templatePath) { throw 'No compatible template found. Supply -TemplatePath with your own compatible MOGRT, or run Install.cmd to choose it.' }
$premiere = Find-SubtitlePremiere -PremierePath $PremierePath
if (-not $premiere -and $Interactive) { $premiere = Find-SubtitlePremiere -PremierePath (Select-SubtitleInstallFile 'Choose Adobe Premiere Pro.exe' 'Adobe Premiere Pro (Adobe Premiere Pro.exe)|Adobe Premiere Pro.exe') }
if (-not $premiere) { throw 'Premiere was not detected. Supply -PremierePath, or run Install.cmd to choose its executable.' }
$presetPath = Join-Path (Split-Path -Parent $premiere.Path) 'Settings/SequencePresets/Legacy/Digital SLR/1080p/DSLR 1080p30.sqpreset'
if (-not (Test-Path -LiteralPath $presetPath -PathType Leaf)) { $presetPath = $null }
Write-Output "Premiere $($premiere.Version): $($premiere.Path)"
Write-Output "Template: $templatePath"
if (-not $premiere.Tested) { Write-Warning 'Only Premiere 26.2.2 has been tested. Verify a short project on this build before normal use.' }
if ((Test-Path -LiteralPath $installPath) -and -not (Test-Path -LiteralPath (Join-Path $installPath 'install-state.json'))) {
    throw 'YTSubtitleProof already exists without our installation marker. Refusing to overwrite it.'
}
$files = @('index.html', 'main.js', 'planner.js', 'appearance.js', 'layout.js', 'scrub.js', 'history.js', 'sessions.js', 'font-data.js', 'host.jsx', 'bridge.jsx')
if ($EnableDebugging) { $files += '.debug' }
foreach ($file in $files + @('CSXS/manifest.xml','vendor/json2.js','../identity.js','../install-reader.ps1')) {
    if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot $file) -PathType Leaf)) { throw "Installation source is incomplete: $file" }
}
if ($InstallReader -and -not (Test-Path -LiteralPath (Join-Path $env:CommonProgramFiles 'Adobe/Adobe Desktop Common/RemoteComponents/UPI/UnifiedPluginInstallerAgent/UnifiedPluginInstallerAgent.exe'))) { throw 'Install Adobe Creative Cloud Desktop first; its plugin installer is required for the reader.' }
if (-not $PSCmdlet.ShouldProcess($installPath, 'Install Subtitle Generator and requested reader')) { return }
if ($InstallReader) { & (Join-Path $PSScriptRoot '../install-reader.ps1') }

New-Item -ItemType Directory -Path (Join-Path $installPath 'CSXS') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $installPath 'vendor') -Force | Out-Null
$registryPath = 'HKCU:/Software/Adobe/CSXS.12'
$statePath = Join-Path $installPath 'install-state.json'
if (-not (Test-Path -LiteralPath $statePath)) {
    $previous = Get-ItemProperty -LiteralPath $registryPath -Name PlayerDebugMode -ErrorAction SilentlyContinue
    @{ previousPlayerDebugMode = $previous.PlayerDebugMode; extensionPath = $installPath } |
        ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding utf8
}

foreach ($file in $files) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination (Join-Path $installPath $file) -Force
}
if (-not $EnableDebugging -and (Test-Path -LiteralPath (Join-Path $installPath '.debug'))) { Remove-Item -LiteralPath (Join-Path $installPath '.debug') }
Copy-Item -LiteralPath (Join-Path $PSScriptRoot '../identity.js') -Destination (Join-Path $installPath 'identity.js') -Force
if (Get-Command node -ErrorAction SilentlyContinue) {
    & node (Join-Path $PSScriptRoot 'scan-fonts.cjs') (Join-Path $installPath 'font-data.js')
    if ($LASTEXITCODE -ne 0) { Write-Warning 'Local font scan failed; the panel will use its standard font choices.' }
} else { Write-Output 'Node is unavailable; using the standard font choices.' }
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'CSXS/manifest.xml') -Destination (Join-Path $installPath 'CSXS/manifest.xml') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'vendor/json2.js') -Destination (Join-Path $installPath 'vendor/json2.js') -Force
$config = @{ templatePath = $templatePath; presetPath = $presetPath } | ConvertTo-Json -Compress
Set-Content -LiteralPath (Join-Path $installPath 'config.js') -Value ('window.proofConfig = ' + $config + ';') -Encoding utf8

New-Item -Path $registryPath -Force | Out-Null
New-ItemProperty -LiteralPath $registryPath -Name PlayerDebugMode -Value '1' -PropertyType String -Force | Out-Null
Write-Output "Subtitle Generator installed at $installPath"
Write-Output 'CEP 12 unsigned-extension developer mode is enabled; its prior value is recorded in install-state.json.'
Write-Output 'Save your project, restart Premiere, and open Window > Extensions > Subtitle Generator.'
Write-Output 'Keep the selected MOGRT installed; the installer references your file without redistributing it.'
