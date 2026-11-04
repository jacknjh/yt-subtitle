(function (root) {
  function defaults() { return { font: 'TimesNewRomanPSMT', size: 85, textColor: '#ebebeb', highlightColor: '#fffe00', x: 50, y: 90, mode: 'reveal', alignment: 'center', centeredReveal: false, lines: 1 }; }
  function anchorX(alignment) { return { left: 0, center: 50, right: 100 }[alignment]; }
  function validate(value) {
    var a = value == null ? defaults() : value;
    if (typeof a.font !== 'string' || !a.font.replace(/\s/g, '').length || a.font.length > 100) throw new Error('Enter a font name.');
    if (typeof a.size !== 'number' || !isFinite(a.size) || a.size < 8 || a.size > 240) throw new Error('Font size must be between 8 and 240.');
    if (!/^#[0-9a-f]{6}$/i.test(a.textColor) || !/^#[0-9a-f]{6}$/i.test(a.highlightColor)) throw new Error('Choose valid text and highlight colors.');
    if (typeof a.x !== 'number' || typeof a.y !== 'number' || !isFinite(a.x) || !isFinite(a.y) || a.x < 0 || a.x > 100 || a.y < 0 || a.y > 100) throw new Error('Subtitle position must be between 0 and 100 percent.');
    if (a.mode !== 'reveal-highlight' && a.mode !== 'reveal') throw new Error('Choose a supported word reveal style.');
    var alignment = a.alignment === undefined ? 'left' : a.alignment;
    if (alignment !== 'left' && alignment !== 'center' && alignment !== 'right') throw new Error('Choose left, center or right alignment.');
    var centeredReveal = a.centeredReveal === undefined ? false : a.centeredReveal;
    var lines = a.lines === undefined ? 1 : a.lines;
    if (typeof centeredReveal !== 'boolean' || (lines !== 1 && lines !== 2)) throw new Error('Choose valid Default and line-count settings.');
    return { font: a.font, size: a.size, textColor: a.textColor, highlightColor: a.highlightColor, x: a.x, y: a.y, mode: a.mode, alignment: alignment, centeredReveal: centeredReveal, lines: lines };
  }
  function captionAt(clips, frame) {
    var low = 0, high = clips.length - 1, candidate = null;
    while (low <= high) {
      var middle = Math.floor((low + high) / 2), clip = clips[middle];
      if (clip.startFrame <= frame) { candidate = clip; low = middle + 1; } else high = middle - 1;
    }
    return candidate && frame < candidate.endFrame ? candidate : null;
  }
  function splitHighlight(text) { var at = text.lastIndexOf(' ') + 1; return { prefix: text.slice(0, at), word: text.slice(at) }; }
  var api = { defaults: defaults, validate: validate, captionAt: captionAt, splitHighlight: splitHighlight, anchorX: anchorX };
  if (typeof module !== 'undefined') module.exports = api; else root.SubtitleAppearance = api;
}(typeof $ !== 'undefined' && $.global ? $.global : this));
