# Settings undo and pinned Style preview

User request: Ctrl+Z/undo inside the panel, and keep the Style preview visible while scrolling controls.

Add panel setting history with Undo/Redo buttons, Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y. Track validated appearance and phrase grouping; merge continuous edits into one step until change/blur/drag completion. A canceled drag creates no undo entry. Keep histories isolated per project/sequence for the lifetime of the panel, and use the existing apply/save path for restoration. Preserve native undo inside text/number inputs and phrase text. Register the shortcuts with CEP so panel shortcuts are received when focus is outside an input. Timeline operations remain in Premiere's undo history, outside the panel's settings history; do not route a settings shortcut to an arbitrary native timeline edit.

Give Style its own fixed-height layout. The preview is a separate fixed pane above independently scrolling controls at narrow widths and alongside them at wide widths. Keep accessible preview controls, scale the canvas proportionally, and allow internal preview scrolling on extremely short panels. Other tabs keep their existing scrolling and the footer remains visible.

Implementation: focused history tests; small JSON-snapshot history helper and installer wiring; scrub completion callback; session-ready callback to select the correct history after settings restore; panel shortcuts and grouped setting events; scoped layout CSS/markup and scroll preservation. Verify keyboard/native text editing, one undo per drag, cancellation, sequence isolation, pinned preview at narrow/wide sizes and unchanged timeline graphics.
