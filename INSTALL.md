# Install Subtitle Generator

Windows development build. Tested with Premiere Pro 26.2.2. Other eligible 26.x builds are untested; Premiere 27.x is excluded by the current manifest.

## Before installing

- Install Premiere and Adobe Creative Cloud Desktop. The latter supplies the plugin installer for the background transcript reader.
- Supply a compatible landscape subtitle MOGRT separately. It must expose the text, color and layout controls the generator expects; a generic MOGRT is not a drop-in replacement. The installer checks required control names. Keep the selected file installed after setup.
- Node.js is optional. If available, the installer scans installed font names; otherwise the panel includes standard font choices.

## Install once

1. Extract the entire ZIP to a folder. Do not run the installer from inside the ZIP.
2. Save open Premiere projects. Double-click **Install.cmd** in the extracted folder.
3. The installer reuses an existing template selection or checks a known local template location. If neither is available, choose your compatible MOGRT when prompted. It checks required exposed controls before installing; that structure check does not prove every custom template renders correctly.
4. Premiere is detected from running instances or standard Adobe installation folders. If necessary, choose its executable in the file picker.
5. Follow any Adobe plugin-installation prompts, then restart Premiere yourself. The installer does not restart it or modify timeline clips.
6. Open **Window > Extensions > Subtitle Generator**. The reader starts in the background; UXP Developer Tools is not needed for normal use.

The installer uses your user profile and the CEP 12 developer-loading registry setting. Its original value is recorded for uninstall. It does not install the third-party template, copy font files, or enable the loopback development debugger. Install.cmd sets a PowerShell execution-policy override only for that installer process.

For custom paths or a read-only preflight, use PowerShell:

```powershell
./Install.ps1 -TemplatePath "D:/Templates/compatible.mogrt" -PremierePath "D:/Adobe/Adobe Premiere Pro 2026"
./Install.ps1 -WhatIf
```

`-WhatIf` checks prerequisites and reports the proposed installation without writing the panel, changing the registry, or installing the reader. File pickers can still appear if paths are missing.

## First subtitles

Open a sequence, generate its transcript in Premiere, and add an empty top video track. Use Generate to load/group the transcript, Style to preview appearance, then Generate subtitles. Output is editable MOGRT word graphics in the active sequence. Captions and SRT are not required.

Appearance and grouping are remembered per project/sequence. Pause/Resume progress lasts only while the panel stays open. Parent Sync copies static template style, preserving text/timing; it does not copy Motion, Transform, Drop Shadow, Sapphire effects or animation keyframes.

## Update or uninstall

Extract a newer package and rerun Install.cmd. Saved sequence settings are separate from the panel installation. Keep your selected template file in place.

To uninstall, close Premiere and remove only `%APPDATA%/Adobe/CEP/extensions/YTSubtitleProof`. First read its `install-state.json` and restore the recorded `previousPlayerDebugMode` under `HKCU/Software/Adobe/CSXS.12`, or remove that property if its recorded value is null. Other unsigned CEP extensions may use that setting. Remove Subtitle Generator Reader through Creative Cloud Desktop's plugin manager if desired.

Saved sequence data remains under `%APPDATA%/Adobe/YTSubtitleGenerator/sessions`; retain it if you want your settings later.

For the source and current compatibility notes, visit https://github.com/jacknjh/yt-subtitle.
