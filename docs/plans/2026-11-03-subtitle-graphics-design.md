# Editable animated subtitle graphics

Approved workflow and design, 2026-11-03.

## User workflow

1. Generate a transcript in Premiere.
2. Open the extension on the active sequence and generate editable subtitle graphics directly from transcript data, without first creating native captions.
3. Choose maximum characters per phrase, or single-word mode.
4. Choose typography, position, and animation; apply settings from a chosen source graphic to the currently selected destination graphics.
5. Correct text and timing after styling, using Premiere's timeline and the extension's Update phrase text operation.

## Graphic structure

Each word interval gets a separate editable graphic displaying the complete phrase. The active word changes between successive graphics, while the phrase layout stays fixed. For example, three adjacent graphics display "This looks great", with active word indices 0, 1, and 2.

Each interval starts at the corresponding spoken word and normally ends at the next word's start. The final interval ends at the phrase boundary. Pauses and overlaps need an explicit policy validated during the prototype; do not silently generate negative or zero-length clips. Use sequence frame boundaries for placement while retaining original transcript times.

The animation template must keep inactive words steady. Highlight changes are the first target. Moving-word effects require separate verification: cutting a clip is not itself an animation, and trimming may affect template animation timing.

User clarification: cumulative word reveal is also a core requested style. Future words stay invisible until spoken, while previously spoken words remain visible. Keep the full phrase's layout fixed so revealing a word does not move existing words. Each interval therefore needs a progression value in addition to the phrase text; highlighting just the current word and revealing words cumulatively are distinct animation settings. The user accepts imperfect initial wording/timing and will correct the generated timeline graphics afterward.

## Phrase grouping

Maximum characters counts spaces and punctuation and never splits a word. A word longer than the limit remains intact. Sentence boundaries and sufficiently long pauses may end a phrase early. Single-word mode is an explicit option, independent of character count. Preserve word timing through grouping.

Regrouping is explicit and must not silently replace manually edited graphics. The initial implementation may require generating into a fresh destination rather than attempting to reconcile arbitrary manual edits.

## Editing and style application

Moving a shared clip boundary changes the active-word interval. Text can be edited on a graphic in Premiere. Duplicating a graphic creates an independent timeline item; changing active-word assignment depends on controls exposed by the template.

Update phrase text updates every managed graphic in the chosen phrase. Style application copies only typography, position, and animation settings supported by the template. It preserves destination text, active-word assignment, timeline position, and duration. Do not copy timing-dependent animation data blindly between different words.

Changing spelling with the same word count preserves assignments. Adding, deleting, or reordering words requires confirming active-word assignments and supplying any missing timing. Do not invent accurate spoken timing from text alone. The editor must explain unresolved assignments before applying changes.

Read the current timeline when applying updates; cached transcript intervals must not overwrite manual timing changes. Determine during the prototype how generated items can be identified persistently and how duplicates inherit identification. Never rely on display names alone or update unrelated graphics by matching text.

## Sequence state

One extension panel follows the active sequence. Save generation settings and managed phrase associations separately per project and sequence using stable identifiers verified on the target host. Switching sequences restores the corresponding state. Ignore stale asynchronous work after the active sequence changes, and verify the target sequence again before mutations.

No live parent relationship is required. A chosen source supplies settings for a deliberate Apply style to selected operation.

## Architecture and scope

Use a host adapter for transcript retrieval, timeline inspection, graphic insertion, editable parameters, and undoable operations. Keep transcript normalization and phrase grouping independent of Premiere so they can be tested locally. A reusable .mogrt is a candidate rendering mechanism, not yet a proven dependency or guarantee of compatibility.

The repository currently contains only README.md. No panel framework, animation library, backend, external transcription service, rendered overlay, or canvas renderer is required by the approved workflow.

## Compatibility gate

Target the user's Premiere 26.2.2 installation. Before production implementation, verify:

- A minimal development panel can load.
- The active project's sequence and activation changes are observable.
- Corrected transcript words and timings can be obtained for the sequence, including source-to-sequence time mapping after edits.
- A graphic/template can be inserted and its text, active-word index, typography, position, and highlight controls edited programmatically.
- Full-phrase layout is identical across word intervals; surrounding words remain steady.
- Moving, trimming, duplicating, saving, reopening, and undoing behave as required.
- Managed phrase membership can be recovered without affecting unrelated graphics.

Current Adobe documentation includes APIs introduced after 26.2.2; version-check each API before using it. Do not promise current UXP examples work on this host. If the gate fails, report the specific unsupported operation and assess another supported extension mechanism before scaffolding a production UI.

## Validation

Local tests cover malformed transcript input, timeline mapping, grouping boundaries, long words, punctuation, single-word mode, and preservation of word times. Host checks cover selection-only style changes, phrase updates, manual timing preservation, duplicate identity, undo, project reopen, and sequence isolation. No host compatibility or rendering claims are established by unit tests alone.

## References

- Transcript API: https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/transcript
- Transcript schema: https://github.com/AdobeDocs/uxp-premiere-pro-samples/blob/main/sample-panels/premiere-api/assets/transcript_format_spec.json
- Premiere API: https://developer.adobe.com/premiere-pro/uxp/ppro-reference/
- Official examples: https://github.com/AdobeDocs/uxp-premiere-pro-samples
