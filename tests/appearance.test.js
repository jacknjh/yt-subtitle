const { test } = require('node:test');
const assert = require('node:assert/strict');
const { defaults, validate, captionAt, splitHighlight } = require('../prototype/cep/appearance');
test('validates appearance settings without sharing mutable defaults', () => {
  const a = defaults(); a.size = 120;
  assert.equal(defaults().size, 85);
  assert.equal(validate(a).size, 120);
  assert.throws(() => validate({ ...a, size: '120' }), /size/);
  assert.throws(() => validate({ ...a, textColor: 'red' }), /color/);
  assert.throws(() => validate({ ...a, x: 101 }), /position/);
  assert.throws(() => validate({ ...a, mode: 'unknown' }), /reveal/);
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
