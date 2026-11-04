# Subtitle Generator (CEP)

Development panel for Premiere 26.2.2 on Windows. It generates editable word-timed graphics from Premiere transcript JSON, copies a chosen style to selected graphics, and updates generated phrase text. Read the [workflow, checks and limits](../../docs/transcript-generator.md).

Run `./prototype/cep/install-dev.ps1 -InstallReader` in PowerShell to install the panel and its background transcript reader. Subsequent panel-only updates can omit `-InstallReader`. Adobe Creative Cloud Desktop supplies the reader installer. The installer uses the locally installed Landscape Karaoke MOGRT in place and includes no third-party template. It records the previous CEP developer registry setting in `%APPDATA%/Adobe/CEP/extensions/YTSubtitleProof/install-state.json` before enabling development loading.

Save and restart Premiere to refresh the menu name under **Window > Extensions > Subtitle Generator** (previously Subtitle Graphics Proof). Open a sequence with a Premiere transcript; its words load automatically. Set the character limit, preview its appearance, and generate. An empty top video track is required. Output goes into a duplicate sequence containing the source video and audio. Existing captions and graphics are retained. Stop keeps partial output; the original is unchanged.

The preview is approximate and supports font, size, colors, position and word reveal settings. Generation imports the template once and reuses independently editable instances; one initial native import dialog may still appear. The progress bar reports completed/total and elapsed time. To match existing graphics, set the graphic under the playhead as parent and sync the current selection to its latest style. This is an explicit sync rather than a continuous relationship.

The panel is organized into Generate, Style, Edit and Help tabs. Generate/Stop, progress and status remain visible below the scrolling tab content. Arrow keys, Home and End navigate the tabs. Style offers a searchable native font dropdown and separate color swatches/hex inputs; only a swatch opens a color picker.

When Node is available, the installer reads font names from standard Windows system/user font folders and builds a local font catalog. It copies no font files and does not enable Node inside the panel. If scanning is unavailable, standard font choices remain. Rerun the installer after adding fonts. Adobe-private fonts and named variable-font instances may not all appear.

Transcript reading uses the installed [UXP reader](../README.md), which starts with Premiere and transfers data locally without opening a second panel. The former three-word test remains available as a host diagnostic, but the panel now exposes the real generator.

**Refresh from Premiere** reads the active sequence again. **Use a JSON file instead > Choose transcript JSON file** opens a saved export as a manual override. The panel remembers its source, snapshot, typography and grouping settings separately for each project path and sequence. A manual override stays manual until you refresh from Premiere. Cached automatic words are shown while refreshing and cannot be generated after a failed refresh. Host calls initialize helper scripts using CEP's explicit extension path so a fresh launch does not depend on `$.fileName`.

The loopback-only development debugger uses port 9227. The panel has no Node integration or network access.

Uninstall **Subtitle Generator Reader** through Creative Cloud Desktop Plugins if removing the companion too. Private snapshots/settings live under `%APPDATA%/Adobe/YTSubtitleGenerator/sessions`; remove that folder only if you want to discard them.

To uninstall the CEP panel, close Premiere and remove only `%APPDATA%/Adobe/CEP/extensions/YTSubtitleProof`. First read `install-state.json` and restore its recorded `previousPlayerDebugMode` under `HKCU/Software/Adobe/CSXS.12`, or remove that property if the previous value was null. Other unsigned panels may depend on that setting.
