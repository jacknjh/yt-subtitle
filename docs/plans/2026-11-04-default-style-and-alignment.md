# Default subtitle style and alignment

User requested Times New Roman, plain word reveal without pop as the template default, and conventional subtitle placement. Automatic pop was subsequently scrapped rather than changing to a two-track timeline. Existing Sync copies static styling and does not copy manually made animation keyframes; do not imply that it does.

New sequence defaults: TimesNewRomanPSMT, reveal without highlight, centered alignment, X=50%, Y=90%. Keep the existing font size and colors. Netflix's general positioning guidance supports centered subtitles near the bottom/top; the exact percentages are this product's adjustable starting point, not a statistical standard. Saved settings remain intact. A Reset style action applies the new default appearance to an existing sequence and is undoable.

Expose Left/Center/Right alignment. Use the template's existing horizontal anchor control, and match it in the canvas preview. The chosen X/Y positions locate the alignment anchor; centering follows the visible growing phrase. Older saved settings without alignment retain left alignment, preserving their old appearance. Parent style sync already includes the horizontal anchor, so alignment copies through the existing route. Update validation, fixtures, HTML defaults, helpers and installed host version together.

Verify new defaults, legacy settings, invalid alignment rejection, undoable Reset style and native anchor readback/rendered positions on a temporary sequence. No automatic pop or keyframe-sync functionality is added.
