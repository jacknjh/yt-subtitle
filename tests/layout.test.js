const { test } = require('node:test');
const assert = require('node:assert/strict');
const layout = require('../prototype/cep/layout');
const appearance = require('../prototype/cep/appearance');
const width = text => text.length * 10;

test('Default centers the completed phrase while left and right grow in spoken order', () => {
  for (const alignment of ['left', 'center', 'right']) {
    const style = { ...appearance.defaults(), centeredReveal: true, alignment, lines: 1 };
    const first = layout.state('I love this', 1, style, width);
    const last = layout.state('I love this', 3, style, width);
    assert.equal(first.text, 'I'); assert.equal(last.text, 'I love this');
    const expected = 960 + ({ left: -55, center: 0, right: 55 }[alignment]);
    assert(Math.abs((first.offset[0] + .5) * 1920 - expected) < .000001);
    assert.deepEqual(first.offset, last.offset);
  }
});

test('Default off retains the configured anchor and legacy single-line placement', () => {
  const style = { ...appearance.defaults(), centeredReveal: false, alignment: 'left', lines: 1 };
  const result = layout.state('I love this', 1, style, width);
  assert.deepEqual(result.offset, [0, .4]); assert.equal(result.anchorY, 50);
});

test('two-line breaks are fixed from the complete phrase and vertical placement does not change', () => {
  const style = { ...appearance.defaults(), centeredReveal: true, alignment: 'left', lines: 2 };
  const first = layout.state('one two three four', 1, style, width);
  const secondLine = layout.state('one two three four', 3, style, width);
  const last = layout.state('one two three four', 4, style, width);
  assert.equal(last.text, 'one two\rthree four');
  assert.equal(secondLine.text, 'one two\rthree');
  assert.equal(first.text, 'one'); assert.equal(first.anchorY, 0);
  assert.deepEqual(first.offset, last.offset); assert.deepEqual(secondLine.offset, last.offset);
  assert.equal(first.paragraph, 1);
});

test('line balancing uses rendered width and leaves single words intact', () => {
  const measure = text => [...text].reduce((n, c) => n + (c === 'W' ? 20 : 1), 0);
  const result = layout.state('WW a b c d', 5, { ...appearance.defaults(), lines: 2 }, measure);
  assert.equal(result.text, 'WW\ra b c d');
  assert.equal(layout.state('Longword', 1, { ...appearance.defaults(), lines: 2 }, width).text, 'Longword');
});
