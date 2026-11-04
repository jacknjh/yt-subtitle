param([string]$RepositoryRoot)
$ErrorActionPreference = 'Stop'
. (Join-Path $RepositoryRoot 'prototype/cep/installation.ps1')
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('subtitle-installer-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot | Out-Null
function Assert($Condition, $Message) { if (-not $Condition) { throw $Message } }
function Assert-Fails([scriptblock]$Action, [string]$Message) {
    try { & $Action | Out-Null } catch { if ($_.Exception.Message -match $Message) { return }; throw }
    throw "Expected failure matching: $Message"
}
function New-TestTemplate([string]$Name, [string[]]$Controls) {
    $path = Join-Path $testRoot $Name
    $archive = [IO.Compression.ZipFile]::Open($path, [IO.Compression.ZipArchiveMode]::Create)
    try {
        $entry = $archive.CreateEntry('definition.json')
        $writer = [IO.StreamWriter]::new($entry.Open())
        try {
            $definition = @{ clientControls = @($Controls | ForEach-Object { @{ uiName = @{ strDB = @(@{ localeString = 'en_US'; str = $_ }) } } }) }
            $writer.Write(($definition | ConvertTo-Json -Depth 8 -Compress))
        } finally { $writer.Dispose() }
    } finally { $archive.Dispose() }
    return $path
}
try {
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $required = @('Text','Characters Per Line','Animation','Fit in Title Safe','Offset','Size','Paragraph Alignment','Anchor X','Anchor Y','Line Spacing','Character Spacing','Word Spacing','Stroke Width','Type-On Opacity','Active Word Opacity','Active Word Stroke On/Off','Box Padding','Box Offset','Box Stroke Width','Box Roundness','Box Opacity','Fill Color','Stroke Color','Active Word Color','Box Fill','Box Stroke')
    $template = New-TestTemplate 'valid template.mogrt' $required
    Assert ((Resolve-SubtitleTemplate -TemplatePath $template) -eq $template) 'Explicit template path was not retained.'
    Assert-Fails { Resolve-SubtitleTemplate -TemplatePath (Join-Path $testRoot 'missing.mogrt') } 'not found'
    $incompatible = New-TestTemplate 'other.mogrt' @('Text')
    Assert-Fails { Resolve-SubtitleTemplate -TemplatePath $incompatible } 'missing.*controls'
    $invalid = Join-Path $testRoot 'invalid.mogrt'
    Set-Content -LiteralPath $invalid -Value 'not a zip'
    Assert-Fails { Resolve-SubtitleTemplate -TemplatePath $invalid } 'read.*MOGRT'
    $configPath = Join-Path $testRoot 'config.js'
    Set-Content -LiteralPath $configPath -Value ('window.proofConfig = ' + (@{ templatePath = $template } | ConvertTo-Json -Compress) + ';')
    Assert ((Resolve-SubtitleTemplate -ExistingConfigPath $configPath -TemplatesRoot $testRoot) -eq $template) 'Existing custom template was not retained.'
    Assert ((Resolve-SubtitleTemplate -TemplatesRoot $testRoot) -eq $null) 'An unknown template was selected.'
    Assert (Test-SubtitlePremiereVersion ([version]'26.2.2')) 'Tested version rejected.'
    Assert (Test-SubtitlePremiereVersion ([version]'26.4.0')) 'Eligible version rejected.'
    Assert (-not (Test-SubtitlePremiereVersion ([version]'26.2.1'))) 'Reader minimum ignored.'
    Assert (-not (Test-SubtitlePremiereVersion ([version]'27.0'))) 'CEP upper bound ignored.'

    & (Join-Path $RepositoryRoot 'scripts/package-release.ps1') -OutputDirectory (Join-Path $testRoot 'release') | Out-Null
    $zip = Get-ChildItem -LiteralPath (Join-Path $testRoot 'release') -Filter '*.zip' | Select-Object -First 1
    Assert ($null -ne $zip) 'Release ZIP missing.'
    $archive = [IO.Compression.ZipFile]::OpenRead($zip.FullName)
    try {
        $names = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\','/') })
        foreach ($name in @('Install.cmd','Install.ps1','README.md','prototype/cep/installation.ps1','prototype/cep/host.jsx','prototype/manifest.json')) { Assert ($names -contains $name) "Release missing $name" }
        Assert (-not ($names -match '\.(mogrt|prproj|aep|ttf|otf)$|(^|/)config\.js$|install-state|(^|/)\.debug$')) 'Release contains private/template/debug files.'
        Assert ($names.Count -eq ($names | Select-Object -Unique).Count) 'Duplicate release entries.'
    } finally { $archive.Dispose() }
    $checksum = Get-Content -LiteralPath ($zip.FullName + '.sha256') -Raw
    $bytes = [IO.File]::ReadAllBytes($zip.FullName)
    $hasher = [Security.Cryptography.SHA256]::Create()
    try { $expectedHash = [BitConverter]::ToString($hasher.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant() } finally { $hasher.Dispose() }
    Assert ($checksum.Contains($expectedHash)) 'Checksum mismatch.'
    Write-Output 'Installer and release checks passed'
} finally {
    $resolved = [IO.Path]::GetFullPath($testRoot)
    $expected = Join-Path ([IO.Path]::GetTempPath()) 'subtitle-installer-test-'
    if ($resolved.StartsWith($expected, [StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $resolved) -match '^subtitle-installer-test-[a-f0-9]{32}$') { Remove-Item -LiteralPath $resolved -Recurse -Force }
}
