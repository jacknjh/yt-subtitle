(function (root) {
  function state(phraseText, count, style, measure) {
    var words = phraseText.replace(/^\s+|\s+$/g, '').split(/\s+/), split = words.length, best = Infinity;
    function width(text) { var value = measure(text); if (typeof value !== 'number' || !isFinite(value) || value < 0) throw new Error('Could not measure subtitle text.'); return value; }
    if (style.lines === 2) for (var i = 1; i < words.length; i++) {
      var score = Math.abs(width(words.slice(0, i).join(' ')) - width(words.slice(i).join(' ')));
      if (score < best) { best = score; split = i; }
    }
    var lines = [words.slice(0, split).join(' ')];
    if (split < words.length) lines.push(words.slice(split).join(' '));
    var completeWidth = width(lines[0]);
    if (lines.length === 2) completeWidth = Math.max(completeWidth, width(lines[1]));
    var anchor = { left: 0, center: 50, right: 100 }[style.alignment];
    var text = words.slice(0, Math.min(count, split)).join(' ');
    if (count > split) text += '\r' + words.slice(split, count).join(' ');
    var x = style.x / 100 - 0.5, y = style.y / 100 - 0.5;
    if (style.centeredReveal) x += (anchor / 100 - 0.5) * completeWidth / 1920;
    // Measured template calibration: 1.2-em leading and a 0.35-em correction for its top anchor.
    if (lines.length === 2) y -= style.size * (1.2 + 0.35) / 1080;
    return { text: text, anchorX: anchor, anchorY: lines.length === 2 ? 0 : 50, paragraph: { left: 1, center: 0, right: 2 }[style.alignment], offset: [x, y] };
  }
  function plan(source, style, measure) {
    if (!style.centeredReveal && style.lines !== 2) return source;
    var clips = [], phrases = [];
    for (var i = 0; i < source.clips.length; i++) {
      var original = source.clips[i], clip = {}, layout = state(original.phraseText, original.text.replace(/^\s+|\s+$/g, '').split(/\s+/).length, style, measure);
      for (var key in original) if (original.hasOwnProperty(key)) clip[key] = original[key];
      clip.text = layout.text; delete layout.text; clip.layout = layout; clips.push(clip);
      phrases[clip.phraseIndex] = clip.text;
    }
    return { phrases: phrases, clips: clips, wordCount: source.wordCount };
  }
  function validate(value) {
    if (!value || (value.anchorX !== 0 && value.anchorX !== 50 && value.anchorX !== 100) || (value.anchorY !== 0 && value.anchorY !== 50) || (value.paragraph !== 0 && value.paragraph !== 1 && value.paragraph !== 2) || !value.offset || value.offset.length !== 2) throw new Error('Invalid subtitle layout.');
    for (var i = 0; i < 2; i++) if (typeof value.offset[i] !== 'number' || !isFinite(value.offset[i]) || Math.abs(value.offset[i]) > 10) throw new Error('Invalid subtitle layout position.');
    return value;
  }
  var api = { state: state, plan: plan, validate: validate };
  if (typeof module !== 'undefined') module.exports = api; else root.SubtitleLayout = api;
}(typeof $ !== 'undefined' && $.global ? $.global : this));
