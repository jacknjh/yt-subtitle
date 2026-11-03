# Transcript generator: development version

Tested in Premiere 26.2.2 on Windows. The tested landscape subtitle MOGRT is a separate local dependency and is not bundled. After Effects is not needed for this route.

## Workflow

1. Generate the source sequence transcript in Premiere.
2. In the UXP compatibility panel, read that sequence's transcript and save its JSON. No captions or SRT export is required.
3. With the same source sequence active, load that JSON in **Window > Extensions > Subtitle Generator**. The menu label updates after restarting Premiere; an already open panel can keep its old tab label until then.
4. Set characters per phrase or single-word mode. An individual long word stays whole. Sentence endings and pauses longer than one second also start a phrase.
5. Adjust the approximate preview's font, size, text/highlight colors, position and word reveal mode. Play or scrub a phrase to inspect timing. These controls apply to newly generated graphics; existing graphics use the parent sync workflow below.
6. Ensure the source sequence has an empty top video track. Generate duplicates the complete video/audio sequence and inserts editable MOGRT word states on that track. The source is never cleared or saved automatically.
7. Use **Stop** to finish the current batch and retain partial output. Switching sequence/project stops the next write. A stopped run cannot resume through the panel; start again from the original source.

The developer session can inject the UXP transcript directly for testing. This is not a shipped automatic bridge and must not be presented as one.

## Editing

The graphic text grows with each word, while the latest word is highlighted. Each state has its own timeline clip. Trim, move, duplicate or remove clips using Premiere's timeline tools. Growing prefixes use a left anchor in the lower part of the frame. The template's line limit is raised to 200 so it does not independently wrap short phrases; very long phrases can run outside the frame. Stable full-phrase wrapping is not implemented. Existing source captions and test graphics are retained on the duplicate and may overlap the generated subtitles.

To copy a style, edit a generated graphic using Premiere's Properties panel, place the playhead over it, and choose **Set parent from playhead**. If multiple generated graphics overlap there, select the intended one first. Select destinations and choose **Sync selected to parent**. Each sync rereads the parent's latest style. It preserves destination text and timeline boundaries, and leaves unselected graphics unchanged. The parent is remembered only for this panel session and project/sequence; there is no continuous automatic link. Supported template controls cover fonts, size, colors, spacing, offset, alignment, box settings and template animation toggles. Animated/keyframed style controls and mixed font runs are rejected before writes. An unexpected host write failure can leave earlier destinations updated; the error reports progress.

To fix a phrase, select one generated graphic and choose **Read selected phrase**. Correct the text and choose **Update phrase text**. Each word graphic gets the corresponding prefix without changing its timing/style. Word count must match the current number of phrase graphics. For a missing word, duplicate a member of the same phrase, position/trim it, then enter the corrected phrase. For an extra word, delete its graphic first. Phrase membership currently uses generated clip names: renaming them breaks grouping, and clips with the same phrase identifier across tracks are treated as members together.

## Verification and remaining work

42 automated tests pass, including invalid timing, frame collisions, partial generation, sequence switching, selection isolation, phrase corrections, parent identity/latest-style reads, preview settings and preserving timeline edits. Before the reuse optimization, a real 26.2.2 run generated all 1,205 word graphics in a duplicate sequence. Every clip's text and start/end boundaries were compared with the plan (within one microsecond), and all passed. The original sequence's formerly empty top track remained empty. A separate project copy was saved successfully as `test - animated subtitles.prproj`.

Live style capture/application and phrase updates succeeded. The reloaded panel's Read selected phrase button populated `Hello, guys.` and enabled phrase editing. Final video frame exports showed `Hello,` followed by `Hello, guys.` in the lower part of the frame with the newest word highlighted. Existing source captions and the earlier native test title remain visible separately.

The real source export had 1,249 records, including 44 blank text records; those are ignored, leaving 1,205 timed words in 317 phrases at the default 24-character limit. User transcript JSON and video frames are kept outside the repository.

## Reuse optimization and preview checks

Generation now imports the template once, then reuses its projectItem to create independent editable graphic instances. It validates the new clip count and timeline position before writing each reused instance, and stops on failure instead of falling back to repeated imports. One initial Premiere import dialog may remain; the panel cannot cover native modal dialogs. The progress bar reports completed graphics, total and elapsed time.

An isolated five-clip test measured 1,878 ms for reuse versus 5,234 ms for repeated imports, excluding sequence creation. That is about 2.8 times faster for this limited insertion test, not a measured speedup for a full transcript with style processing.

The actual generator also created four real transcript states on a copy of the original roughly 120 fps sequence in 2,105 ms including sequence cloning. Their read-back boundaries matched the expected word frames. This verifies the reuse path on the real source timebase without rerunning the full transcript.

The actual generator created three word states using Arial Bold, size 110, a green highlight and 20%/75% position. Native property readbacks and exported frames confirmed the settings and independent text. Another native test changed the parent's fill after picking it, then synced one destination: that destination received the new color and retained its text; an unselected graphic stayed white. A real panel Generate click completed a three-word transcript with the progress bar at 3/3 and Stop disabled on completion. The existing 1,205-word output sequence was restored afterward.

The canvas preview uses the same planned word intervals and settings, but browser font metrics and the MOGRT renderer differ. It previews a solid background rather than the source video. It is deliberately labeled approximate. Font size is mapped through the template's exposed scale control relative to its authored font size.

## Buttons and controls

| Control | Effect |
| --- | --- |
| Load transcript JSON | Load exported sequence words and timings and bind them to the active source sequence. |
| Characters per phrase | Group whole words by maximum phrase length. Sentence endings and long pauses can split earlier. |
| One word at a time | Generate one visible word per graphic instead of growing phrases. |
| Preview phrase | Choose which grouped phrase to preview. |
| Play preview / Pause preview | Animate or pause the approximate word reveal. |
| Preview timing slider | Scrub the chosen phrase without creating timeline clips. |
| Appearance controls | Choose font, size, colors, position and reveal with/without highlight for new generation. |
| Generate subtitles | Duplicate the source sequence and create editable graphics using the chosen appearance. |
| Stop | Finish the current batch and retain partial output. |
| Set parent from playhead | Remember the generated graphic under the playhead as the style parent. |
| Sync selected to parent | Copy the parent's latest style to currently selected graphics; preserve words and timing. |
| Read selected phrase | Load the full phrase associated with one selected generated graphic. |
| Update phrase text | Rewrite its word-prefix graphics using the corrected phrase, retaining current clip boundaries. |
| What do these buttons do? | Expand the in-panel usage guide. |

Not verified: a full ten-minute run using the new reuse path, undo grouping, reopening the saved project, other Premiere versions, non-Landscape templates, or large selections for style/phrase edits. The panel manifest currently restricts loading to Premiere 26.2.x–26.x. Automatic transcript transfer, saved per-sequence sessions, arbitrary animation authoring, and a redistributable template remain outstanding.
