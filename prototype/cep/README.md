# Template graphics proof (CEP)

This is a development test for Premiere 26.2.x, separate from the UXP transcript panel. It uses the user's already installed Karaoke subtitle template in place. No third-party template is included or redistributed.

## Install

Run in PowerShell:

```powershell
./prototype/cep/install-dev.ps1
```

The script checks for the local Karaoke template and an installed 1080p sequence preset, copies only this panel into `%APPDATA%/Adobe/CEP/extensions/YTSubtitleProof`, and enables `HKCU/Software/Adobe/CSXS.12/PlayerDebugMode` for development loading. The previous registry value is stored in that directory's `install-state.json`. It does not change existing templates or extensions.

Save the open project and restart Premiere if the panel is not listed under **Window > Extensions > Subtitle Graphics Proof**. Open the panel, then click **Create three-word test**. The button adds a uniquely named test sequence; the existing sequence is not cleared, overwritten, or saved automatically.

## Expected proof

The new sequence should contain three adjacent editable MOGRT clips, each lasting approximately one second (rounded to whole frames):

- 0–1 seconds: `I`
- 1–2 seconds: `I like`
- 2–3 seconds: `I like this`

The test preserves the template's existing font, disables its automatic clip animation, and requests left alignment and a left anchor so previous words can remain in place. Type-On Opacity and Active Word Opacity are set to 100; Box Opacity is zero. Text writes are checked by reading back the template value. Rendered frames are used to verify visual word progression.

This tests a single-line prefix approach. It does not yet implement full-phrase layout with hidden future words, automatic wrapping, transcript-driven timings, style copying, or phrase updates. If an insertion or write fails, partial test graphics are left in the named test sequence and reported. The script does not remove user material to clean up.

The template is required to expose `Text`, `Animation`, `Fit in Title Safe`, `Paragraph Alignment`, `Anchor X`, `Type-On Opacity`, `Active Word Opacity`, and `Box Opacity`. Text must use a JSON value containing `textEditValue` with uniform font styling. Unsupported representations are rejected; the test does not attempt to decode binary text buffers. A bundled standard JSON polyfill supports ExtendScript hosts without native JSON.

## Development state and cleanup

The panel has a loopback-only development debugger configured at port 9227. No Node integration or network access is enabled in the panel.

To remove the development installation, close the panel/Premiere and remove the explicitly named `%APPDATA%/Adobe/CEP/extensions/YTSubtitleProof` directory. Before removing it, read `install-state.json`: restore its recorded `previousPlayerDebugMode` value under `HKCU/Software/Adobe/CSXS.12`, or remove the `PlayerDebugMode` property if the recorded value is null. Other local unsigned CEP panels also depend on this developer setting; do not remove it if you now need it for those panels.
