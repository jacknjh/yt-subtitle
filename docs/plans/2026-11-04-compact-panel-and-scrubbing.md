# Compact panel and draggable numeric values

User request: shorten Generate, add useful separators across tabs, and allow font size/horizontal/vertical values to be adjusted by click-drag while retaining typing.

Keep the existing dark Premiere theme and tab structure. Place transcript source and Refresh in a compact section, remove repeated instructions from Generate, retain a collapsed manual JSON fallback, and separate phrase grouping with a rule. Divide Style into Typography, Colors, Position and Animation; Edit into parent sync and phrase correction; Help into related topics. Preserve all control IDs and existing generation/session behavior.

Add a small pointer-based number-field helper for the three requested inputs. Drag horizontally with pointer capture, clamp to the existing bounds, update preview and saved settings through the existing appearance handler, and use Shift for finer changes. A click enters normal typing with native keyboard number controls. Escape/pointer cancellation restores the original value; disabled inputs ignore drags. Keep a visible hint, descriptive titles, and horizontal resize cursors.

Checks: focused pointer tests for threshold, clamping, fine movement, cancellation, typing and disabled controls; existing panel regression tests; live CEP interaction and narrow/wide layout checks. Do not generate or modify timeline graphics for this UI task. Add the helper to the installer and document controls.
