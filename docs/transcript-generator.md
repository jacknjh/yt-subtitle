# Transcript generator: development version

Tested in Premiere 26.2.2 on Windows. The tested landscape subtitle MOGRT is a separate local dependency and is not bundled. After Effects is not needed for this route.

## Workflow

1. Generate the source sequence transcript in Premiere.
2. In the UXP compatibility panel, read that sequence's transcript and save its JSON. No captions or SRT export is required.
3. With the same source sequence active, load that JSON in **Window > Extensions > Subtitle Graphics Proof**.
4. Set characters per phrase or single-word mode. An individual long word stays whole. Sentence endings and pauses longer than one second also start a phrase.
5. Ensure the source sequence has an empty top video track. Generate duplicates the complete video/audio sequence and inserts editable MOGRT word states on that track. The source is never cleared or saved automatically.
6. Use **Stop** to finish the current batch and retain partial output. Switching sequence/project stops the next write. A stopped run cannot resume through the panel; start again from the original source.

The developer session can inject the UXP transcript directly for testing. This is not a shipped automatic bridge and must not be presented as one.

## Editing

The graphic text grows with each word, while the latest word is highlighted. Each state has its own timeline clip. Trim, move, duplicate or remove clips using Premiere's timeline tools. Growing prefixes use a left anchor in the lower part of the frame. The template's line limit is raised to 200 so it does not independently wrap short phrases; very long phrases can run outside the frame. Stable full-phrase wrapping is not implemented. Existing source captions and test graphics are retained on the duplicate and may overlap the generated subtitles.

To copy a style, edit a generated graphic using Premiere's Properties panel, select just that graphic, and choose **Capture selected style**. Then select destinations and choose **Apply to selected graphics**. Supported template controls cover fonts, size, colors, spacing, offset, alignment, box settings and template animation toggles. Text and timeline boundaries are preserved. Animated/keyframed style controls and mixed font runs are rejected before writes. An unexpected host write failure can leave earlier destinations updated; the error reports progress.

To fix a phrase, select one generated graphic and choose **Read selected phrase**. Correct the text and choose **Update phrase text**. Each word graphic gets the corresponding prefix without changing its timing/style. Word count must match the current number of phrase graphics. For a missing word, duplicate a member of the same phrase, position/trim it, then enter the corrected phrase. For an extra word, delete its graphic first. Phrase membership currently uses generated clip names: renaming them breaks grouping, and clips with the same phrase identifier across tracks are treated as members together.

## Verification and remaining work

31 automated tests pass, including invalid timing, frame collisions, partial generation, sequence switching, selection isolation, phrase corrections, and preserving timeline edits. A real 26.2.2 run generated all 1,205 word graphics in a duplicate sequence. Every clip's text and start/end boundaries were compared with the plan (within one microsecond), and all passed. The original sequence's formerly empty top track remained empty. A separate project copy was saved successfully as `test - animated subtitles.prproj`.

Live style capture/application and phrase updates succeeded. The reloaded panel's Read selected phrase button populated `Hello, guys.` and enabled phrase editing. Final video frame exports showed `Hello,` followed by `Hello, guys.` in the lower part of the frame with the newest word highlighted. Existing source captions and the earlier native test title remain visible separately.

The real source export had 1,249 records, including 44 blank text records; those are ignored, leaving 1,205 timed words in 317 phrases at the default 24-character limit. User transcript JSON and video frames are kept outside the repository.

Not verified: undo grouping, reopening the saved project, other Premiere versions, non-Landscape templates, or large selections for style/phrase edits. The panel manifest currently restricts loading to Premiere 26.2.x–26.x. Automatic transcript transfer, saved per-sequence sessions, arbitrary animation authoring, and a redistributable template remain outstanding.
