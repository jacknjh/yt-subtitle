(function (root) {
  function planTranscript(data, maxCharacters, singleWord, fps) {
    if (!data || !Array.isArray(data.segments)) throw new Error('Transcript JSON must contain segments.');
    if (!Number.isInteger(maxCharacters) || maxCharacters < 1 || maxCharacters > 200) throw new Error('Characters per phrase must be between 1 and 200.');
    if (!Number.isFinite(fps) || fps <= 0) throw new Error('Sequence frame rate is unavailable.');
    const words = [];
    for (const segment of data.segments) {
      if (!segment || !Array.isArray(segment.words)) throw new Error('Each segment must contain words.');
      for (const word of segment.words) {
        if (!word || typeof word.text !== 'string') throw new Error('A transcript word has no text.');
        const text = word.text.trim();
        if (!text) continue;
        if (word.type === 'punctuation') {
          if (!words.length) throw new Error('Punctuation appears before the first word.');
          words[words.length - 1].text += text;
          words[words.length - 1].eos = word.eos || /[.!?]$/.test(text);
          continue;
        }
        if (word.type && word.type !== 'word') continue;
        if (!Number.isFinite(word.start) || word.start < 0 || !Number.isFinite(word.duration) || word.duration <= 0) throw new Error('Invalid word timing for “' + text + '”.');
        const frame = Math.round(word.start * fps);
        if (words.length && frame <= words[words.length - 1].frame) throw new Error('Two words start on the same frame or out of order. Correct their transcript timing first.');
        words.push({ text, start: word.start, duration: word.duration, frame, eos: word.eos || /[.!?]$/.test(text) });
      }
    }
    if (!words.length) throw new Error('The transcript contains no timed words.');
    const phrases = [];
    let phrase = [];
    for (const word of words) {
      const previous = phrase[phrase.length - 1];
      if (phrase.length && (singleWord || previous.eos || word.start - (previous.start + previous.duration) > 1 || phrase.map(w => w.text).join(' ').length + 1 + word.text.length > maxCharacters)) {
        phrases.push(phrase); phrase = [];
      }
      phrase.push(word);
    }
    if (phrase.length) phrases.push(phrase);
    const clips = [];
    phrases.forEach((items, phraseIndex) => {
      const phraseText = items.map(w => w.text).join(' ');
      items.forEach((word, index) => {
        const next = words[clips.length + 1];
        const naturalEnd = Math.max(word.frame + 1, Math.round((word.start + word.duration) * fps));
        const endFrame = index + 1 < items.length ? items[index + 1].frame : Math.min(naturalEnd, next ? next.frame : naturalEnd);
        clips.push({ text: items.slice(0, index + 1).map(w => w.text).join(' '), phraseText, phraseIndex, wordIndex: index, startFrame: word.frame, endFrame });
      });
    });
    return { phrases: phrases.map(items => items.map(w => w.text).join(' ')), clips, wordCount: words.length };
  }
  if (typeof module !== 'undefined') module.exports = { planTranscript };
  else root.planTranscript = planTranscript;
}(this));
