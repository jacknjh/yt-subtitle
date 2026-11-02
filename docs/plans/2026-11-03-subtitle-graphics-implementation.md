# Editable Subtitle Graphics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generate editable full-phrase subtitle graphics with timed active words, selection-based style copying, and phrase-wide text updates.

**Architecture:** First prove the required host operations on Premiere 26.2.2. Then implement a small panel, pure transcript/grouping logic, and a host adapter using only the operations demonstrated by that probe. Timeline data is authoritative for manual timing edits.

**Tech Stack:** JavaScript, Premiere extension APIs selected by the compatibility probe, a verified editable graphics template if required, and Node's built-in test runner for pure logic. No framework or runtime dependency is selected yet.

---

## Task 1: Establish host compatibility

**Files:** Create `prototype/README.md`, `prototype/manifest.json`, `prototype/index.html`, `prototype/main.js`, and `docs/premiere-compatibility.md`. Manifest and entrypoint format depend on the verified extension mechanism.

1. Check installed host/build and development tooling using read-only inspection. Discover code through codebase-memory-mcp first if code has been added; index the repository if needed.
2. Consult versioned Adobe references and official samples for transcript export, sequence identification, template insertion, parameter editing, and persistent item identification. Record minimum versions and unsupported operations.
3. Create the smallest loadable diagnostic panel. Keep each diagnostic operation explicit; do not automatically mutate the user's sequence.
4. Load it in Premiere and retrieve a corrected transcript for a test sequence. Compare words and timings against playback after a source trim and a timeline cut. Record whether the transcript is sequence-level or source-level and the mapping required.
5. Insert three test graphics for one phrase. Set text, active indices, color, size, position, and highlight. Confirm independent edits and identical layout in the Program Monitor.
6. Test trimming, duplication, undo, save/reopen, selection reads, and sequence switching. Determine reliable phrase membership and duplicate handling.
7. Record PASS/FAIL and evidence for every compatibility requirement in the design. Stop dependent implementation if an essential operation fails; report the exact blocker and assess supported alternatives.

**Verification:** An in-host demonstration on 26.2.2 is required. A successful manifest load alone does not pass this gate. Document any check that requires user interaction as unverified until performed.

## Task 2: Normalize words and group phrases

**Files:** Create `src/transcript.js`, `src/phrases.js`, `tests/transcript.test.js`, `tests/phrases.test.js`, `tests/fixtures/transcript.json`, and `package.json` with a `node --test` test command. Use anonymized probe data in the fixture.

1. Write failing tests for word text/start/duration extraction, non-finite or negative timing rejection, malformed input, and source-to-sequence mapping established by Task 1.
2. Run `node --test tests/transcript.test.js`; confirm the intended failures, then implement only the validated schema and mapping. Rerun to pass.
3. Write failing grouping tests: `Hello world` fits limit 11; limit 10 makes two phrases; a word exceeding the limit remains whole; single-word mode emits one word per phrase. Include punctuation, sentence boundaries, a long pause, and unchanged word timestamps.
4. Run `node --test tests/phrases.test.js`; implement grouping and rerun to pass. Choose and document the pause threshold from the real transcript fixture, not speculative configuration.
5. Add interval tests for gaps, overlapping timings, final word duration, and frame quantization at the test sequence's frame rate. Reject unresolved collisions instead of silently dropping words.

**Verification:** `node --test` passes with deterministic expected phrase text, membership, and timeline intervals.

## Task 3: Generate managed editable graphics

**Files:** Create `src/host.js`, `src/session.js`, `src/generate.js`, `tests/generate.test.js`, and production panel entry files based on the probe. Include `assets/subtitle.mogrt` only if a real validated template has been created; document its editable controls in `assets/README.md`.

1. Write a test around the generation command using a small fake host: three words create three intervals with the same phrase text and distinct active indices. Verify targeting and frame placement.
2. Implement the smallest adapter around the proven APIs. Validate transcript and template prerequisites before starting mutations.
3. Use the host's verified undo/transaction mechanism. If insertion is not atomic, report partial results clearly and retain recoverable membership; never delete unrelated timeline items during cleanup.
4. Persist project/sequence state and phrase membership using the identity mechanism proved in Task 1. Invalidate pending reads when sequences change and recheck target identity before writing.
5. Add tests for a sequence switch during an asynchronous read and a failed insertion. Confirm neither writes to the newly active sequence nor reports complete generation.
6. Generate a short real sequence; compare clip boundaries, active words, full-phrase layout, and undo in Premiere.

**Verification:** `node --test tests/generate.test.js` passes. Host demonstration confirms editable graphics, clean selection isolation, and saved state recovery.

## Task 4: Copy style to selected graphics

**Files:** Create `src/style.js` and `tests/style.test.js`; modify `src/host.js` and panel controls.

1. Write a failing test with one source, two selected destinations, and an unselected graphic. Assert only supported typography, position, and animation settings change. Text, active indices, and interval boundaries stay identical.
2. Implement an explicit Choose source operation followed by Apply style to selected. Read destination selection at apply time and reject unsupported items clearly.
3. Expose only style parameters verified by the probe. Verify operations are undoable and do not reset internal timing controls.
4. Run `node --test tests/style.test.js`, then demonstrate selection-only application on the host.

## Task 5: Update phrase text without losing timeline corrections

**Files:** Create `src/update-phrase.js` and `tests/update-phrase.test.js`; modify `src/host.js`, `src/session.js`, and panel controls.

1. Write failing tests for same-count spelling corrections: every member receives new phrase text; active indices, current timeline boundaries, and styles are preserved.
2. Add cases for a missing member, a duplicated member, inserted/deleted/reordered words, and an invalid active index. Ambiguous changes must return a mapping/timing issue before any mutation.
3. Implement Update phrase text using current host membership and timing. For changed word count, show the existing assignments and require explicit mapping/timing input or instruct the user to resolve the clips before applying. Never infer that duplicate persistent IDs identify the original clip uniquely.
4. Run `node --test tests/update-phrase.test.js` to pass. On the host, duplicate and trim a clip, fix phrase text, and confirm manual timing survives and unrelated phrases remain untouched.

## Task 6: Finish the panel and verify the workflow

**Files:** Modify production panel entry files and `README.md`; create `docs/manual-verification.md`.

1. Apply the relevant interface skill before building production UI. Add active-sequence status, character limit, single-word mode, Generate, source selection, Apply style to selected, and Update phrase text. Disable actions when prerequisites are missing and present actionable host errors.
2. Keep regeneration explicit. Do not overwrite existing edited graphics implicitly. Limit the first implementation to generating into a fresh destination if safe reconciliation is not established.
3. Run `node --test` and inspect `git diff --check`.
4. Exercise the complete workflow in Premiere: transcript, generate, style selected, trim word boundary, duplicate missing step, update phrase text, undo, save/reopen, and switch sequences.
5. Document installation, supported host/build, template controls and limits, editing implications, and any checks that remain unperformed. Claim completion only for behaviors actually verified.

Later task details and template-specific parameter mappings must be revised using Task 1 evidence before execution. Live parent linking, external transcription, rendered overlays, a canvas preview, and arbitrary animation authoring are outside the first version.
