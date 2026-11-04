# Transcript reader and compatibility diagnostics

For normal use, run the root `Install.cmd` or `./Install.ps1`, save your project and restart Premiere once. See [installation instructions](../INSTALL.md). **Subtitle Generator Reader** starts in the background; the CEP Subtitle Generator reads its local request/reply files automatically. Developer Tools are only needed for the diagnostic/development setup below. The reader writes heartbeat/request/reply files inside its own plugin-data folder; it does not modify the project.

This panel reads Premiere data. It does not insert, trim, delete, or modify timeline items. Diagnostic exports are written only when you choose Save; background transfer uses private plugin-data files. No network connection is used by the panel.

## Setup

1. Open Premiere Pro 26.2.2 and a project with a short transcribed sequence.
2. In Premiere, open **Edit > Preferences > Plugins** and enable developer mode. Follow any restart instruction shown by Premiere.
3. Install/open **UXP Developer Tools 2.2 or later** using Adobe's supported setup process. Enable developer mode in the developer tool if requested.
4. In UXP Developer Tools, add an existing plugin and choose **this directory's `manifest.json`**. Load it into Premiere.
5. Open **Window > UXP Plugins > Subtitle Generator Reader** if the panel did not open automatically.

Official [development-tool setup](https://developer.adobe.com/premiere-pro/uxp/introduction/essentials/dev-tools/) and [first-plugin loading guide](https://developer.adobe.com/premiere-pro/uxp/plugins/). If loading fails, record the error and installed UDT version; do not edit the manifest to claim a different host or runtime.

## Check transcript access

1. Use a short sequence containing a few clearly spoken words. Fix one transcription error in Premiere's Text panel.
2. Click **Read sequence transcript**. Save the diagnostic report and transcript JSON separately. An error can also be saved as a diagnostic report.
3. Confirm the corrected word is present in the JSON. Compare word start/duration values against playback.
4. Repeat after trimming the source and cutting/reordering a clip in the sequence. Record whether timings follow the edited sequence or remain relative to original source media.

The prototype exports only the active sequence's associated project item. It deliberately does not fall back to the first source clip or first item in the project. If the sequence transcript is inaccessible, that is a useful compatibility result.

## Check graphics access

1. Add a text graphic manually in Premiere, select only that item on the timeline, and click **Inspect selected graphic**. Save the report.
2. Repeat with an existing editable MOGRT if you have one. A subtitle-specific template is not included yet.
3. Reports distinguish an empty return value, a read error, and an actual returned value for each parameter. They record types and accessor availability, not the parameter's text content.

`hasSetAction: true` only means an action method exists. It does not mean text or style writes work. This version performs no write probe. A later focused probe must verify writing actual text and active-word controls, undo, and animation layout before full generation is implemented.

## Sequence changes

Run a check, switch sequences, and confirm the report/export buttons reset. Repeat while a check is running; its old result must not become the new sequence's report. Project activation is also monitored. If event subscription fails, the panel shows a warning; checks still compare active project/sequence IDs before returning, but automatic result invalidation is not established.

Saved files represent the snapshot captured by a check. They do not update when the transcript or graphic changes. Run the check again after edits. A report may contain project/sequence/item names and host error messages; the transcript file contains the actual transcript.

## What to return

Provide the saved diagnostic reports for the transcript and selected graphic, plus whether the corrected word and timings matched the sequence. If setup fails, provide the exact loading error instead. The transcript file can stay local unless needed to investigate its schema or timing.
