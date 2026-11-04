# Generate in place and resume

User-requested behavior: generate directly in the active sequence and recover from switching timelines during a run.

Use the existing empty top video track without cloning or activating sequences. Retain one unfinished run in the open panel, including its frozen plan, appearance and next word index. Pause after a batch on request or immediately before the next write when the active sequence/project differs. Resume only after returning to the originating timeline. Keep completed graphics; discard forgets the run without deleting graphics. Panel/Premiere restart recovery is outside this change.

Native writes keep their own completed count. A partial batch paused by a sequence switch reports that count so Resume never replays completed words. Validate that the dedicated output track still contains the same generated clips at their recorded boundaries before further writes. Unknown insertion/configuration failures invalidate continuation rather than guessing whether a partial clip was written.

Implementation/checklist:
1. Update simulated host fixtures and failing tests for in-place generation, mid-batch switching/resume, track edits and errors.
2. Remove cloning, retain native state on safe pauses, and guard output track ownership before each write.
3. Keep the frozen run in the panel; add Pause, Resume and Discard controls, progress and source-timeline feedback. Disable fresh generation while a run is pending.
4. Test UI continuation with partial batches, frozen plans and sequence mismatch; update help/docs and install.
5. Run the full suite and syntax checks. Verify a small live run on a temporary timeline if Premiere is available; do not regenerate the user's clip.
