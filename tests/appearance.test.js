const { test } = require('node:test');
const assert = require('node:assert/strict');
const { defaults, validate, captionAt, splitHighlight, anchorX } = require('../prototype/cep/appearance');
test('ExtendScript dependencies register globally when loaded from a host method', () => {
  const fs = require('node:fs'), vm = require('node:vm');
  const context = vm.createContext({ $: { global: {} } });
  for (const file of ['../prototype/cep/appearance.js', '../prototype/cep/layout.js', '../prototype/identity.js']) vm.runInContext('(function(){' + fs.readFileSync(require.resolve(file), 'utf8') + '}).call({})', context);
  assert.equal(typeof context.$.global.SubtitleAppearance.validate, 'function');
  assert.equal(typeof context.$.global.SubtitleIdentity.same, 'function');
  assert.equal(typeof context.$.global.SubtitleLayout.state, 'function');
});
test('validates appearance settings without sharing mutable defaults', () => {
  const a = defaults(); a.size = 120;
  assert.equal(defaults().size, 85);
  assert.equal(validate(a).size, 120);
  assert.throws(() => validate({ ...a, size: '120' }), /size/);
  assert.throws(() => validate({ ...a, textColor: 'red' }), /color/);
  assert.throws(() => validate({ ...a, x: 101 }), /position/);
  assert.throws(() => validate({ ...a, mode: 'unknown' }), /reveal/);
  assert.throws(() => validate({ ...a, lines: 3 }), /line-count/);
  assert.throws(() => validate({ ...a, centeredReveal: 'true' }), /Default/);
});

test('new subtitle styles use Times New Roman, plain reveal and a bottom-center anchor', () => {
  const a = defaults();
  assert.equal(a.font, 'TimesNewRomanPSMT');
  assert.equal(a.mode, 'reveal');
  assert.equal(a.alignment, 'center');
  assert.equal(a.x, 50); assert.equal(a.y, 90);
  assert.deepEqual(['left', 'center', 'right'].map(anchorX), [0, 50, 100]);
  assert.throws(() => validate({ ...a, alignment: 'unknown' }), /alignment/);
});

test('older saved styles retain their previous left alignment', () => {
  const a = defaults(); delete a.alignment;
  assert.equal(validate(a).alignment, 'left');
  delete a.lines; delete a.centeredReveal;
  assert.equal(validate(a).lines, 1); assert.equal(validate(a).centeredReveal, false);
});
test('preview uses the same word intervals as timeline output and blanks gaps', () => {
  const clips = [{ startFrame: 5, endFrame: 10, text: 'Hello' }, { startFrame: 12, endFrame: 20, text: 'Hello guys' }];
  assert.equal(captionAt(clips, 4), null);
  assert.equal(captionAt(clips, 5).text, 'Hello');
  assert.equal(captionAt(clips, 10), null);
  assert.equal(captionAt(clips, 12).text, 'Hello guys');
  assert.equal(captionAt(clips, 20), null);
  assert.deepEqual(splitHighlight('Hello guys.'), { prefix: 'Hello ', word: 'guys.' });
});
