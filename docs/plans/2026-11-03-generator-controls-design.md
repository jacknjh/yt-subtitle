# Subtitle Generator controls and performance

User-approved choices: instant approximate animated preview; explicit parent from playhead and Sync selected button, with no continuous relationship.

Rename the panel title/menu to Subtitle Generator while preserving its extension ID and install directory. Keep Premiere's dark theme. Add a 16:9 canvas preview with text, play/pause, a word-time scrubber, font, size, base/highlight colors, position and word reveal controls. Mark it Approximate preview. Use these same validated settings when creating actual MOGRT clips; unsupported host fonts or template controls must produce visible errors.

Set parent from playhead finds a generated subtitle containing the playhead in the active sequence. If more than one matches, require one selected matching graphic. Store its clip node ID, sequence ID and project path. Sync selected rereads this parent's current style and copies it only to the current selected graphics. Preserve destination text and timing, reject missing/stale parents or unsupported destinations before writing. Keep capture selected style as an optional manual source shortcut only if needed; otherwise replace it with the clearer parent workflow.

Generation currently imports a MOGRT per word. Test reusing the first imported clip's projectItem with track.overwriteClip. Adopt reuse only after native tests prove independent editable text and correct boundaries. Do not silently fall back to repeated imports if reuse fails. Reduce redundant UI refreshes and show a determinate progress bar with completed/total, elapsed time and Stop. Premiere owns native dialogs; the panel must not claim to suppress them. Expect one initial template import, then reused instances.

Keep original sequence isolation, frame validation, stoppable batches and partial-result reporting. No new dependencies or rendered subtitle overlays. Automatic transcript bridging, persistent sequence sessions and continuous parent linking remain separate work.
