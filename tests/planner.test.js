const { test } = require('node:test');
const assert = require('node:assert/strict');
const { planTranscript } = require('../prototype/cep/planner.js');
const transcript = words => ({ segments: [{ words: words.map(([text, start, duration, eos]) => ({ text, start, duration, eos, type: 'word' })) }] });

test('groups whole words by character limit and preserves word reveal times', () => {
  const plan = planTranscript(transcript([['I', .5, .2], ['like', 1, .2], ['this', 1.5, .3], ['too', 2, .3]]), 11, false, 30);
  assert.deepEqual(plan.clips.map(c => c.text), ['I', 'I like', 'I like this', 'too']);
  assert.deepEqual(plan.clips.map(c => [c.startFrame, c.endFrame]), [[15, 30], [30, 45], [45, 54], [60, 69]]);
  assert.equal(plan.phrases.length, 2);
  assert.equal(plan.clips[2].phraseText, 'I like this');
});

test('single word mode, sentence endings and long pauses break phrases', () => {
  const data = transcript([['Hello.', 0, .2, true], ['A', .4, .2], ['longword', 3, .2]]);
  assert.equal(planTranscript(data, 40, false, 30).phrases.length, 3);
  assert.deepEqual(planTranscript(data, 40, true, 30).clips.map(c => c.text), ['Hello.', 'A', 'longword']);
});

test('rejects malformed timing and frame collisions before any timeline writes', () => {
  assert.throws(() => planTranscript(transcript([['bad', -1, .2]]), 20, false, 30), /timing/);
  assert.throws(() => planTranscript(transcript([['one', 0, .2], ['two', .001, .2]]), 20, false, 30), /same frame/);
  assert.throws(() => planTranscript({}, 20, false, 30), /segments/);
});

test('attaches punctuation without inventing a timed graphic and does not drop long words', () => {
  const data = transcript([['Hello', 0, .3], [',', .3, 0], ['extraordinary', .5, .4]]);
  data.segments[0].words[1].type = 'punctuation';
  assert.deepEqual(planTranscript(data, 6, false, 30).clips.map(c => c.text), ['Hello,', 'extraordinary']);
});
