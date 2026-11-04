# yt-subtitle

An extension in development for editable animated subtitles in Premiere. The approved design displays a complete phrase across successive word intervals, with the spoken word highlighted or animated. Users can style selected graphics and update phrase text together.

## Current status

The CEP panel now generates editable, word-timed MOGRT graphics from Premiere transcript JSON. It groups whole words by character limit (or shows one word at a time), duplicates the source sequence, and inserts growing phrase prefixes on an empty top video track. Generation runs in stoppable batches. A separate UXP panel reads the sequence transcript.

[Load and run the prototype](prototype/README.md). [Compatibility findings and pending checks](docs/premiere-compatibility.md).

The [Subtitle Generator CEP panel](prototype/cep/README.md) offers an approximate animated preview and appearance controls before generation. It also syncs selected graphics to the latest style of a parent chosen under the playhead, and updates phrase text while retaining timeline boundaries. It imports the installed Karaoke MOGRT once per run and reuses independent editable instances, with a progress bar and Stop control. That template is not distributed. Its installer records the prior CEP developer setting.

Generate, Style, Edit and Help tabs separate the workflow, while generation actions and status stay visible. The Style tab includes searchable local font faces and color swatches with editable hex values.

Automatic transfer between the transcript reader and generator is still missing. Current setup requires reading/saving JSON in the UXP panel, then loading it in the CEP panel. Sequence sessions and settings are not persisted. Single-line word reveal is supported; full-phrase layout with invisible future words and stable multiline wrapping remain pending.

[Generator workflow and checks](docs/transcript-generator.md). [Earlier proof and rendered frames](docs/mogrt-proof.md).

The documented UXP `MogrtText` API starts at 27.0, so a complete graphics implementation for 26.2.2 must not assume that API is available. Parameter inspection is diagnostic evidence, not proof that writing text works.

## Local checks

Requires Node.js 20 or later. No packages need installing.

```powershell
npm test
node --check prototype/main.js
node --check prototype/probe.js
```

These checks exercise transcript parsing, grouping, host guards, selected style copying, phrase updates and panel behavior with a simulated host. Real Premiere checks are documented separately; tests do not establish cross-version compatibility.

## Design

- [Approved design](docs/plans/2026-11-03-subtitle-graphics-design.md)
- [Implementation plan](docs/plans/2026-11-03-subtitle-graphics-implementation.md)
