# Transcript generator: development version

Tested in Premiere 26.2.2 on Windows. The tested landscape subtitle MOGRT is a separate local dependency and is not bundled. After Effects is not needed for this route.

## Workflow

1. Generate the source sequence transcript in Premiere.
2. Install the background reader once with `./prototype/cep/install-dev.ps1 -InstallReader`, then save and restart Premiere. No captions or SRT export is required.
3. Open **Window > Extensions > Subtitle Generator**. The active sequence transcript loads automatically. **Refresh from Premiere** rereads corrections; generation also refreshes an automatic source before creating graphics. **Use a JSON file instead** provides the manual fallback.
4. Set characters per phrase or single-word mode. An individual long word stays whole. Sentence endings and pauses longer than one second also start a phrase.
5. Adjust the approximate preview's font, size, text/highlight colors, position and word reveal mode. Play or scrub a phrase to inspect timing. These controls apply to newly generated graphics; existing graphics use the parent sync workflow below.
6. Ensure the current sequence has an empty top video track. Generate inserts editable MOGRT word states directly on that track. It does not clone, clear or save the sequence. Existing generated subtitles must be removed before another fresh run in the same sequence.
7. Use **Pause** to finish the current batch and retain progress. Switching sequence/project also pauses the next write. Return to the original timeline and choose **Resume** to continue from the next unfinished word. The run retains its original grouping and appearance even if you change preview settings. Completed subtitle clip positions must remain unchanged until generation finishes. **Discard run** forgets continuation without deleting completed graphics. One unfinished run is retained while the panel remains open; restart recovery is not supported.

The reader uses local files inside its own plugin-data folder, with no network service or broad filesystem permission. Requests and responses include project/sequence identity and a unique request/session ID. Sequence changes discard pending replies. Settings and snapshots are stored privately per project GUID, project path and sequence GUID under `%APPDATA%/Adobe/YTSubtitleGenerator/sessions`. A cached automatic transcript is labeled and cannot be used for generation until refreshed. Manual JSON stays a manual override after reopening until Refresh is chosen. Parent selection remains temporary.

## Editing

The graphic text grows with each word, while the latest word is highlighted. Each state has its own timeline clip. Trim, move, duplicate or remove clips using Premiere's timeline tools. Growing prefixes use a left anchor in the lower part of the frame. The template's line limit is raised to 200 so it does not independently wrap short phrases; very long phrases can run outside the frame. Stable full-phrase wrapping is not implemented. Existing source captions and test graphics are retained in the sequence and may overlap the generated subtitles.

To copy a style, edit a generated graphic using Premiere's Properties panel, place the playhead over it, and choose **Set parent from playhead**. If multiple generated graphics overlap there, select the intended one first. Select destinations and choose **Sync selected to parent**. Each sync rereads the parent's latest style. It preserves destination text and timeline boundaries, and leaves unselected graphics unchanged. The parent is remembered only for this panel session and project/sequence; there is no continuous automatic link. Supported template controls cover fonts, size, colors, spacing, offset, alignment, box settings and template animation toggles. Animated/keyframed style controls and mixed font runs are rejected before writes. An unexpected host write failure can leave earlier destinations updated; the error reports progress.

To fix a phrase, select one generated graphic and choose **Read selected phrase**. Correct the text and choose **Update phrase text**. Each word graphic gets the corresponding prefix without changing its timing/style. Word count must match the current number of phrase graphics. For a missing word, duplicate a member of the same phrase, position/trim it, then enter the corrected phrase. For an extra word, delete its graphic first. Phrase membership currently uses generated clip names: renaming them breaks grouping, and clips with the same phrase identifier across tracks are treated as members together.

## Verification and remaining work

89 automated tests pass, including invalid timing, frame collisions, partial generation, sequence switching, selection isolation, phrase corrections, parent identity/latest-style reads, preview settings, font-name parsing, tabs, hex colors, cold-start initialization and preserving timeline edits. Before the reuse optimization, a real 26.2.2 run generated all 1,205 word graphics in a duplicate sequence. Every clip's text and start/end boundaries were compared with the plan (within one microsecond), and all passed. The original sequence's formerly empty top track remained empty. A separate project copy was saved successfully as `test - animated subtitles.prproj`.

Live style capture/application and phrase updates succeeded. The reloaded panel's Read selected phrase button populated `Hello, guys.` and enabled phrase editing. Final video frame exports showed `Hello,` followed by `Hello, guys.` in the lower part of the frame with the newest word highlighted. Existing source captions and the earlier native test title remain visible separately.

The real source export had 1,249 records, including 44 blank text records; those are ignored, leaving 1,205 timed words in 317 phrases at the default 24-character limit. User transcript JSON and video frames are kept outside the repository.

## Reuse optimization and preview checks

Generation now imports the template once, then reuses its projectItem to create independent editable graphic instances. It validates the new clip count and timeline position before writing each reused instance, and stops on failure instead of falling back to repeated imports. One initial Premiere import dialog may remain; the panel cannot cover native modal dialogs. The progress bar reports completed graphics, total and elapsed time.

An isolated five-clip test measured 1,878 ms for reuse versus 5,234 ms for repeated imports, excluding sequence creation. That is about 2.8 times faster for this limited insertion test, not a measured speedup for a full transcript with style processing.

The actual generator also created four real transcript states on a copy of the original roughly 120 fps sequence in 2,105 ms including sequence cloning. Their read-back boundaries matched the expected word frames. This verifies the reuse path on the real source timebase without rerunning the full transcript.

The actual generator created three word states using Arial Bold, size 110, a green highlight and 20%/75% position. Native property readbacks and exported frames confirmed the settings and independent text. Another native test changed the parent's fill after picking it, then synced one destination: that destination received the new color and retained its text; an unselected graphic stayed white. A real panel Generate click completed a three-word transcript with the progress bar at 3/3 and Stop disabled on completion. The existing 1,205-word output sequence was restored afterward.

The canvas preview uses the same planned word intervals and settings, but browser font metrics and the MOGRT renderer differ. It previews a solid background rather than the source video. It is deliberately labeled approximate. Font size is mapped through the template's exposed scale control relative to its authored font size.

## Buttons and controls

**Generate** contains transcript loading and phrase grouping. **Style** contains the preview and appearance controls. **Edit** contains parent synchronization and phrase corrections. **Help** explains the workflow. Generate/Pause, progress and status remain visible on every tab. Tab changes preserve settings and each tab's scroll position; moving away from Style pauses its preview.

| Control | Effect |
| --- | --- |
| Refresh from Premiere | Reread the active sequence transcript directly from Premiere. |
| Choose transcript JSON file | Open a previously exported JSON file and bind its words/timings to the active source sequence. This does not fetch Premiere's transcript. |
| Characters per phrase | Group whole words by maximum phrase length. Sentence endings and long pauses can split earlier. |
| One word at a time | Generate one visible word per graphic instead of growing phrases. |
| Preview phrase | Choose which grouped phrase to preview. |
| Play preview / Pause preview | Animate or pause the approximate word reveal. |
| Preview timing slider | Scrub the chosen phrase without creating timeline clips. |
| Appearance controls | Choose font, size, colors, position and reveal with/without highlight for new generation. |
| Generate subtitles | Create editable graphics directly in the active sequence using the chosen appearance. |
| Pause | Finish the current batch and retain progress. |
| Resume | Continue the unfinished run after returning to its timeline; preserve the original plan and style. |
| Discard run | Forget continuation without deleting completed graphics. |
| Set parent from playhead | Remember the generated graphic under the playhead as the style parent. |
| Sync selected to parent | Copy the parent's latest style to currently selected graphics; preserve words and timing. |
| Read selected phrase | Load the full phrase associated with one selected generated graphic. |
| Update phrase text | Rewrite its word-prefix graphics using the corrected phrase, retaining current clip boundaries. |
| Search fonts / Font face | Filter local font faces and choose one from a native dropdown. Searching retains the current choice until another face is selected. |
| Font size / Horizontal / Vertical | Drag left or right to adjust, hold Shift for fine control, or click to type. Enter finishes typing; Escape cancels a drag. |
| Color swatch / hex field | Open a native picker from the swatch, or enter #RRGGBB directly. Labels and surrounding space do not open the picker. |
| Undo / Redo | Restore panel appearance/grouping using buttons or Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y. Native text undo is preserved inside focused editors. |
| Help tab | Read the in-panel usage guide. |

## Panel interaction checks, November 4

The previous color input was wrapped in a large label. In the actual CEP renderer, clicking that label activated the native color input. The replacement uses non-clickable text labels with accessible names on individual swatches and separate hex fields. Trusted mouse checks confirmed zero picker activations from label/gap/hex clicks and one activation from the swatch. Hex edits update the swatch, and native-picker input/change events update the hex field.

The old font field was a four-item datalist in CEP's Chromium 99 renderer. The replacement is a native select plus search. The development installer indexed 542 local font faces from Windows system/user font files, reading display/family/style names separately from the PostScript identifier used by Premiere. No font files or user font inventory are stored in the repository. Native keyboard selection of Arial changed the actual appearance value to ArialMT. The preview uses the font's family and style metadata.

The installer refreshes the local catalog when Node is available; otherwise the panel retains standard choices. Fonts in Adobe-private locations and named variable-font instances may be absent. Rerun the installer to refresh fonts after adding them.

Live keyboard checks passed for arrow/Home/End tab navigation. All tabs were checked at widths 280, 420 and 800 pixels: no horizontal overflow and the action/status footer remained visible. This UI update did not generate or change timeline graphics.

## Restart initialization fix

After a fresh Premiere launch, even `1+1` returned `EvalScript error.` through the panel bridge. The first manifest-loaded JSX was resolving dependencies through `$.fileName`, which Adobe documents as unreliable on the first loaded JSX. The manifest script now defines the host API without loading dependencies. Each browser host call supplies the extension path from CEP and explicitly initializes the JSON/appearance helpers before the requested operation. No inferred current working directory is used.

The live bridge recovered after installing the fix: `1+1` returned 2 and the active-sequence context returned valid JSON. Clicking the file button opened the native `Load Premiere transcript JSON` chooser. Canceling it restored the controls and showed explicit file-selection guidance. Tests cover initialization with no JSON and an empty `$.fileName`, the explicit browser path, cancellation feedback and a readable native-bridge error. Direct transcript fetching and persistence were added separately in the automatic-reader update below.

Not verified: a full ten-minute run using the new reuse path, undo grouping, reopening the saved project, other Premiere versions, non-Landscape templates, or large selections for style/phrase edits. The panel manifest currently restricts loading to Premiere 26.2.xÃ¢â‚¬â€œ26.x. Arbitrary animation authoring and a redistributable template remain outstanding.

## Automatic reader, November 4

The installed reader transfers the live active-sequence transcript into CEP. A live read returned 1,205 timed words without a JSON chooser and without regenerating or changing timeline graphics. Panel reload restored saved appearance/grouping settings. Automated checks cover request identity, expired requests, sequence changes during reads, stale snapshot gating, manual overrides and per-sequence restoration. The bridge normalizes Windows extended paths because Premiereâ€™s UXP and CEP APIs format the same project path differently.

After the user restarted Premiere, the installed External reader heartbeat and current transcript were present without reloading the reader through Developer Tools. Installed startup behavior is verified on this Premiere build.

## In-place generation and resume, November 4

Generation no longer clones the sequence. Native state and the panel keep the completed word count on safe pauses, including partial batches interrupted by a sequence switch. Resume does not re-export the transcript or regroup words midway through a run. Before further insertion, the dedicated track is checked against recorded clip identities and boundaries. Changes to that track pause the run; unknown write failures invalidate continuation instead of guessing whether a partial graphic exists.

A live isolated 29.97 fps check generated one word directly in the test sequence, switched to the user’s timeline, confirmed a pause at one completed word, returned and resumed to three words. Text and all boundaries matched readback (0–0.5005, 0.5005–1.001, 1.001–1.5015 seconds). Generation created no duplicate sequence. The temporary test sequence was deleted and the user’s original active timeline restored. The full ten-minute transcript was not regenerated.

## Compact layout and numeric scrubbing, November 4

Generate now has compact transcript and grouping sections without repeated instructions. The timeline name is limited to two displayed lines, with the complete name in its tooltip; word and phrase totals have their own short summary. Manual JSON and first-phrase details remain collapsed. Section rules separate Style’s Typography, Colors, Position and Animation controls, plus related Edit and Help controls.

In the actual CEP renderer at 720 pixels high, Generate content height changed from 586.7 to 381.8 pixels at width 280, from 494.6 to 322.4 at width 420, and from 406.2 to 303.5 at width 800. All four tabs had no horizontal overflow at these widths, and the footer stayed inside the viewport.

Live mouse/keyboard checks verified font size 85 to 95 by dragging, Escape restoring 85, direct typing of 92 and Enter ending editing, horizontal position 15 to 25, and Shift-drag vertical position 80 to 80.5. Original settings were restored afterward. Pointer capture keeps drags active outside the field; cancellation or window focus loss restores the original value. Tests cover bounds, cancellation, edit mode, disabled fields and the shared preview handler. No timeline graphics were generated or modified for this UI change.

## Settings undo and pinned preview, November 4

Panel settings use per-timeline undo/redo histories for the lifetime of the open panel. Continuous typing, color edits and numeric drags are grouped until completion; cancellation removes the gesture’s undo entry and preserves any prior redo. A new committed edit clears redo. Histories contain validated settings only and apply through the same preview/save path. Sequence settings finish restoring before their history becomes editable. Timeline mutations are outside this settings history and remain managed by Premiere. The keyboard shortcuts are registered using Adobe CEP’s `registerKeyEventsInterest` so focus outside an input does not send a settings shortcut to the host.

Style now gives the preview and controls independent scrolling. At widths 280/420 the preview is above the controls; at width 800 it is beside them. Live checks at heights 400 and 720 confirmed that the canvas position did not change when the settings scrolled to the bottom, its content retained a 16:9 ratio, the footer stayed visible and no horizontal overflow appeared. The preview pane can scroll internally on very short panels. Style’s own settings scroll position is retained across tab changes.

Live keyboard checks passed for Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y, button undo, one undo for a multi-move drag, and native undo inside both a numeric input and the phrase textarea. Original user settings were restored. No timeline generation or graphic edits were performed for this change.
