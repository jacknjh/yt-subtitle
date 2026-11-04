# Automatic transcript and sequence sessions

User-approved scope: automatically read the active sequence transcript and restore per-sequence settings after reopen; retain manual JSON as fallback.

The current Premiere 26.2.2 build exposes transcript export through UXP and working graphics generation through CEP. Install a small startup UXP reader using Adobe's UPIA/CCX mechanism. Communicate through request/reply JSON in the reader's own plugin-data folder; no network, browser Node integration, or full-filesystem UXP permission is needed. A heartbeat identifies the reader and protocol. CEP discovers only this plugin's data folder for the current Premiere major version.

Every request has a unique ID plus project and sequence GUIDs. The reader checks active identity before export and verifies it again after export. CEP rejects stale/mismatched replies and verifies its own active context before accepting them. Changed sequences cancel pending reads without switching the user's timeline. Reader failure is explicit; manual JSON remains available.

Poll active project/sequence identity lightly while the panel is idle, pausing during generation. On activation, save the prior sequence's settings, restore this sequence's cache/settings, then request the latest transcript. Cache entries include identity, source, capture time and settings. Cached data is labeled and cannot silently pass as a fresh automatic read. Refresh explicitly rereads Premiere for corrections. Store snapshots privately in application data; do not write transcript contents into the repository.

Files: a packaged reader with reused transcript export logic; CEP host mailbox/session functions; a small session controller; panel source/refresh/status controls; installer packaging and companion installation; focused request/race/persistence tests and live verification.

Verify the installed reader's heartbeat, current transcript, missing transcript handling, sequence changes during reads, manual fallback, settings isolation and panel reload. Test actual Premiere restart only after protecting the user's project. Keep the existing editable graphics output intact.
