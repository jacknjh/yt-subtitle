function Test-SubtitlePremiereVersion([version]$Version) {
    return $Version -ge [version]'26.2.2' -and $Version -lt [version]'27.0'
}

function Resolve-SubtitleTemplate {
    param([string]$TemplatePath, [string]$ExistingConfigPath, [string]$TemplatesRoot = (Join-Path $env:APPDATA 'Adobe/Common/Motion Graphics Templates'))
    if (-not $TemplatePath -and $ExistingConfigPath -and (Test-Path -LiteralPath $ExistingConfigPath -PathType Leaf)) {
        $config = Get-Content -LiteralPath $ExistingConfigPath -Raw
        $match = [regex]::Match($config, '^\s*window\.proofConfig\s*=\s*(\{.*\})\s*;\s*$', 'Singleline')
        if ($match.Success) {
            try {
                $saved = ($match.Groups[1].Value | ConvertFrom-Json).templatePath
                if ($saved -and (Test-Path -LiteralPath $saved -PathType Leaf)) { $TemplatePath = $saved }
            } catch { }
        }
    }
    if (-not $TemplatePath) {
        $name = '16' + [char]0x2022 + '9 Karaoke Subtitles.mogrt'
        $candidate = Join-Path $TemplatesRoot ('Captioneer/Landscape/' + $name)
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { $TemplatePath = $candidate } else { return $null }
    }
    if (-not (Test-Path -LiteralPath $TemplatePath -PathType Leaf)) { throw "Template not found: $TemplatePath" }
    $resolved = (Get-Item -LiteralPath $TemplatePath).FullName
    if ([IO.Path]::GetExtension($resolved) -ine '.mogrt') { throw 'Choose a compatible .mogrt file.' }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = $null
    try {
        $archive = [IO.Compression.ZipFile]::OpenRead($resolved)
        $entry = $archive.GetEntry('definition.json')
        if (-not $entry -or $entry.Length -gt 1048576) { throw 'Missing or oversized template definition.' }
        $reader = [IO.StreamReader]::new($entry.Open())
        try { $definition = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
    } catch { throw "Could not read MOGRT '$resolved': $($_.Exception.Message)" }
    finally { if ($archive) { $archive.Dispose() } }
    $names = @($definition.clientControls | ForEach-Object { $_.uiName.strDB | ForEach-Object { $_.str } })
    $required = @('Text','Characters Per Line','Animation','Fit in Title Safe','Offset','Size','Paragraph Alignment','Anchor X','Anchor Y','Line Spacing','Character Spacing','Word Spacing','Stroke Width','Type-On Opacity','Active Word Opacity','Active Word Stroke On/Off','Box Padding','Box Offset','Box Stroke Width','Box Roundness','Box Opacity','Fill Color','Stroke Color','Active Word Color','Box Fill','Box Stroke')
    $missing = @($required | Where-Object { $names -cnotcontains $_ })
    if ($missing.Count) { throw ('Template is missing required controls: ' + ($missing -join ', ') + '. A different MOGRT is not a drop-in replacement.') }
    return $resolved
}

function Find-SubtitlePremiere {
    param([string]$PremierePath)
    $paths = @()
    if ($PremierePath) {
        if (Test-Path -LiteralPath $PremierePath -PathType Container) { $PremierePath = Join-Path $PremierePath 'Adobe Premiere Pro.exe' }
        if (-not (Test-Path -LiteralPath $PremierePath -PathType Leaf)) { throw "Premiere executable not found: $PremierePath" }
        $paths = @($PremierePath)
    } else {
        $paths += @(Get-Process -Name 'Adobe Premiere Pro' -ErrorAction SilentlyContinue | ForEach-Object { $_.Path })
        foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)}) | Select-Object -Unique) {
            if (-not $base) { continue }
            $adobe = Join-Path $base 'Adobe'
            if (-not (Test-Path -LiteralPath $adobe -PathType Container)) { continue }
            $paths += @(Get-ChildItem -LiteralPath $adobe -Directory -Filter 'Adobe Premiere Pro*' | ForEach-Object { Join-Path $_.FullName 'Adobe Premiere Pro.exe' })
        }
    }
    $candidates = @($paths | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -Unique | ForEach-Object {
        $file = Get-Item -LiteralPath $_
        $match = [regex]::Match($file.VersionInfo.ProductVersion, '^\d+\.\d+(?:\.\d+){0,2}')
        if ($match.Success) {
            $version = [version]$match.Value
            if (Test-SubtitlePremiereVersion $version) { [pscustomobject]@{ Path = $file.FullName; Version = $version; Tested = ($version -eq [version]'26.2.2') } }
        }
    })
    if (-not $candidates.Count) {
        if ($PremierePath) { throw 'This Premiere version is outside the supported manifest range (26.2.2 up to, excluding, 27.0).' }
        return $null
    }
    return $candidates | Sort-Object -Property Tested, Version -Descending | Select-Object -First 1
}

function Select-SubtitleInstallFile([string]$Title, [string]$Filter) {
    Add-Type -AssemblyName System.Windows.Forms
    $picker = New-Object System.Windows.Forms.OpenFileDialog
    try {
        $picker.Title = $Title; $picker.Filter = $Filter; $picker.CheckFileExists = $true
        if ($picker.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { throw 'Installation cancelled. No installation changes made.' }
        return $picker.FileName
    } finally { $picker.Dispose() }
}
