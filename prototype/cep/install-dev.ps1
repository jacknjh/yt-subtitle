$ErrorActionPreference = 'Stop'
$templateName = '16' + [char]0x2022 + '9 Karaoke Subtitles.mogrt'
$templatePath = Join-Path $env:APPDATA ('Adobe/Common/Motion Graphics Templates/Captioneer/Landscape/' + $templateName)
$presetPath = 'C:/Program Files/Adobe/Adobe Premiere Pro 2026/Settings/SequencePresets/Legacy/Digital SLR/1080p/DSLR 1080p30.sqpreset'
if (-not (Test-Path -LiteralPath $templatePath -PathType Leaf)) { throw 'The local Karaoke test template is missing. No installation changes made.' }
if (-not (Test-Path -LiteralPath $presetPath -PathType Leaf)) { throw 'The local sequence preset is missing. No installation changes made.' }

$extensionRoot = Join-Path $env:APPDATA 'Adobe/CEP/extensions'
$installPath = Join-Path $extensionRoot 'YTSubtitleProof'
if ((Test-Path -LiteralPath $installPath) -and -not (Test-Path -LiteralPath (Join-Path $installPath 'install-state.json'))) {
    throw 'YTSubtitleProof already exists without our installation marker. Refusing to overwrite it.'
}

New-Item -ItemType Directory -Path (Join-Path $installPath 'CSXS') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $installPath 'vendor') -Force | Out-Null
$registryPath = 'HKCU:/Software/Adobe/CSXS.12'
$statePath = Join-Path $installPath 'install-state.json'
if (-not (Test-Path -LiteralPath $statePath)) {
    $previous = Get-ItemProperty -LiteralPath $registryPath -Name PlayerDebugMode -ErrorAction SilentlyContinue
    @{ previousPlayerDebugMode = $previous.PlayerDebugMode; extensionPath = $installPath } |
        ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding utf8
}

foreach ($file in @('index.html', 'main.js', 'planner.js', 'host.jsx', '.debug')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination (Join-Path $installPath $file) -Force
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'CSXS/manifest.xml') -Destination (Join-Path $installPath 'CSXS/manifest.xml') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'vendor/json2.js') -Destination (Join-Path $installPath 'vendor/json2.js') -Force
$config = @{ templatePath = $templatePath; presetPath = $presetPath } | ConvertTo-Json -Compress
Set-Content -LiteralPath (Join-Path $installPath 'config.js') -Value ('window.proofConfig = ' + $config + ';') -Encoding utf8

New-Item -Path $registryPath -Force | Out-Null
New-ItemProperty -LiteralPath $registryPath -Name PlayerDebugMode -Value '1' -PropertyType String -Force | Out-Null
Write-Output "Development panel installed at $installPath"
Write-Output 'CEP 12 unsigned-extension developer mode is enabled; its prior value is recorded in install-state.json.'
Write-Output 'Save your project, restart Premiere, and open Window > Extensions > Subtitle Graphics Proof.'
