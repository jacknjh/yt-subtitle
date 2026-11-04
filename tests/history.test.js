const { test } = require('node:test');
const assert = require('node:assert/strict');
const createHistory = require('../prototype/cep/history');

test('undo and redo restore independent setting snapshots', () => {
  const initial = { appearance: { size: 85 }, characters: 24 };
  const history = createHistory(initial);
  initial.appearance.size = 1;
  history.record({ appearance: { size: 90 }, characters: 24 });
  assert.equal(history.undo().appearance.size, 85);
  assert.equal(history.redo().appearance.size, 90);
  const copy = history.value(); copy.appearance.size = 2;
  assert.equal(history.value().appearance.size, 90);
});

test('continuous changes form one step and separate gestures stay separate', () => {
  const history = createHistory({ size: 85 });
  for (const size of [86, 87, 90]) history.record({ size }, 'size');
  history.end();
  history.record({ size: 95 }, 'size'); history.end();
  assert.deepEqual(history.undo(), { size: 90 });
  assert.deepEqual(history.undo(), { size: 85 });
  assert.equal(history.canUndo(), false);
});

test('canceled gestures and unchanged settings add no undo step', () => {
  const history = createHistory({ size: 85 });
  history.record({ size: 90 }, 'size'); history.record({ size: 85 }, 'size'); history.end();
  assert.equal(history.canUndo(), false);
  history.record({ size: 85 });
  assert.equal(history.canUndo(), false);
});

test('a new edit after undo clears redo, without a no-op edit clearing redo', () => {
  const history = createHistory({ size: 85 });
  history.record({ size: 90 }); history.undo();
  history.record({ size: 85 }); assert.equal(history.canRedo(), true);
  history.record({ size: 100 }); assert.equal(history.canRedo(), false);
});

test('canceling a gesture preserves a previously available redo', () => {
  const history = createHistory({ size: 85 });
  history.record({ size: 90 }); history.undo();
  history.record({ size: 100 }, 'drag'); history.record({ size: 85 }, 'drag'); history.end();
  assert.deepEqual(history.redo(), { size: 90 });
});
