# yt-subtitle

An extension in development for editable animated subtitles in Premiere. The approved design displays a complete phrase across successive word intervals, with the spoken word highlighted or animated. Users can style selected graphics and update phrase text together.

## Current status

The first deliverable is a read-only UXP compatibility prototype targeting Premiere 26.2.2. It reads the active sequence's transcript and inspects a selected graphic's parameters. It does **not** generate subtitle graphics yet.

[Load and run the prototype](prototype/README.md). [Compatibility findings and pending checks](docs/premiere-compatibility.md).

A separate [CEP template proof](prototype/cep/README.md) tests creating three editable timed text states using an already installed MOGRT. Its development installer records the prior CEP developer setting. This proof is not the finished transcript-to-subtitles workflow.

The documented UXP `MogrtText` API starts at 27.0, so a complete graphics implementation for 26.2.2 must not assume that API is available. Parameter inspection is diagnostic evidence, not proof that writing text works.

## Local checks

Requires Node.js 20 or later. No packages need installing.

```powershell
npm test
node --check prototype/main.js
node --check prototype/probe.js
```

These checks exercise diagnostic behavior with a simulated host. They do not validate Premiere compatibility or rendering.

## Design

- [Approved design](docs/plans/2026-11-03-subtitle-graphics-design.md)
- [Implementation plan](docs/plans/2026-11-03-subtitle-graphics-implementation.md)
