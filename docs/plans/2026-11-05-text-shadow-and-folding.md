# Text shadow and compact Style controls

Status: the user withdrew the shadow option after testing. Shadow UI, preview and generation code have been removed; saved flags are ignored. Collapsible Style groups and keyboard-only undo/redo remain. The shadow design below is historical.

User-approved scope: one subtitle-text shadow switch, independently collapsible Style groups, removal of the visible panel header and Undo/Redo buttons, and retention of Ctrl+Z / Ctrl+Shift+Z. Keep native text undo while editing a field. Preserve existing styles, transcript loading, generation/resume, parent Sync and phrase editing.

Use native details/summary elements for Typography, Colors, Position and Animation. Typography starts open; invalid-field focus opens its containing group. Keep Reset all style available above the groups and retain the pinned preview.

Add `appearance.shadow`, default false, with a legacy fallback and strict boolean validation. The Colors section's Text shadow checkbox controls a fixed black preset: 70% opacity, 135 degrees, distance 4, softness 8. Canvas previews approximate the same shadow. Include the flag in settings persistence, reset, history and frozen generation settings.

The installed MOGRT exposes no shadow property. Attach Premiere's native Drop Shadow effect per new word graphic. CEP requires QE for effect insertion; preflight effect availability, find the new clip by its exact start ticks on the already-validated output track, and verify that the component exists before configuring it. Scan from the end of the QE track to avoid repeatedly traversing earlier generated graphics. Leave existing unrelated effects and Sync's template-only contract unchanged.

Verification: regression tests for backward-compatible settings, boolean validation, keyboard history, generation payloads, native preset attachment with QE gaps and unsupported-effect preflight. Live checks cover native generation with shadow on/off, rendered-frame alpha differences, cleanup of temporary sequences, collapsible keyboard behavior, invalid-field focus, Ctrl+Z / Ctrl+Shift+Z, native typing undo, pinned preview, layout and accessibility audits.
