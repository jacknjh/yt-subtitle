# Subtitle Generator Controls Implementation Plan

> Use superpowers:executing-plans task by task.

**Goal:** Add preview controls and a parent workflow, and eliminate repeated template imports where native validation succeeds.

**Architecture:** Existing CEP panel and ExtendScript host, with a dependency-free shared style/preview module. The host validates style at its boundary and reuses one imported projectItem per generation. Parent identity is checked in the active project/sequence before each sync.

**Tech stack:** HTML canvas, JavaScript, ExtendScript, Node test runner.

1. Benchmark native template reuse in an isolated sequence; verify original and reused text remain independent. No bulk regeneration for benchmarks.
2. Add failing host tests for one import per generation, reused instance identity/timing guards, selected parent ambiguity, stale/missing parents, latest-style rereads and preserving unselected graphics.
3. Implement reuse and parent functions in `prototype/cep/host.jsx`, retaining shared style preflight and text validation. Run `node --test tests/cep-proof.test.js`.
4. Add tested style validation and deterministic preview word selection in `prototype/cep/appearance.js`, with `tests/appearance.test.js`. Map font/size/colors/offset/reveal settings to real template controls in the host.
5. Update `prototype/cep/index.html`, `main.js`, manifest and installer: Subtitle Generator title, approximate canvas preview, native labeled form controls, playhead-parent buttons, progress bar and Stop. Extend `tests/generator-panel.test.js` for generation settings/progress and edit controls.
6. Run `npm test`, syntax checks and `git diff --check`. Install and reload after safely preserving the loaded transcript. Verify short native generation, preview controls, live-parent reread and selection isolation. Restore the user's existing output sequence afterward. Document button meanings and measured performance without projecting unmeasured speedups.
