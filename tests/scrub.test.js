const { test } = require('node:test');
const assert = require('node:assert/strict');
const attach = require('../prototype/cep/scrub');

function field(value = '85') {
  const events = {}, keys = {}, classes = new Set();
  const document = { activeElement: null, body: { classList: { add: c => classes.add(c), remove: c => classes.delete(c) } }, addEventListener(name, handler) { keys[name] = handler; } };
  const input = { value, min: '8', max: '240', disabled: false, ownerDocument: document,
    addEventListener(name, handler) { events[name] = handler; },
    setPointerCapture(id) { this.capture = id; }, releasePointerCapture() { this.capture = null; },
    focus() { document.activeElement = this; }, blur() { document.activeElement = null; }, select() { this.selected = true; },
  };
  let changes = 0;
  attach(input, () => changes++);
  const fire = (name, x = 100, extra = {}) => events[name]({ button: 0, pointerId: 1, clientX: x, preventDefault() {}, ...extra });
  return { input, document, classes, fire, key: key => keys.keydown({ key, preventDefault() {} }), changes: () => changes };
}

test('click enters typing without changing the value; a drag updates and releases capture', () => {
  const f = field();
  f.fire('pointerdown'); f.fire('pointerup', 101);
  assert.equal(f.input.value, '85'); assert.equal(f.input.selected, true); assert.equal(f.changes(), 0);
  f.document.activeElement = null;
  f.fire('pointerdown'); f.fire('pointermove', 120); f.fire('pointerup', 120);
  assert.equal(Number(f.input.value), 90); assert.equal(f.changes(), 1);
  assert.equal(f.input.capture, null); assert.equal(f.classes.size, 0);
});

test('drag clamps to bounds and Shift provides fine adjustment', () => {
  const f = field('239');
  f.fire('pointerdown'); f.fire('pointermove', 120); assert.equal(Number(f.input.value), 240);
  f.fire('pointermove', -2000); assert.equal(Number(f.input.value), 8);
  f.fire('pointerup', -2000);
  f.input.value = '85';
  f.fire('pointerdown'); f.fire('pointermove', 120, { shiftKey: true });
  assert.equal(Number(f.input.value), 85.5);
});

test('Escape and pointer cancellation restore the initial value', () => {
  for (const cancel of ['escape', 'pointercancel', 'lostpointercapture']) {
    const f = field();
    f.fire('pointerdown'); f.fire('pointermove', 120);
    if (cancel === 'escape') f.key('Escape'); else f.fire(cancel);
    assert.equal(f.input.value, '85'); assert.equal(f.changes(), 2);
    assert.equal(f.classes.size, 0);
  }
});

test('disabled fields, non-primary clicks, invalid values and focused typing do not start drags', () => {
  for (const mode of ['disabled', 'focused', 'invalid', 'secondary']) {
    const f = field();
    if (mode === 'disabled') f.input.disabled = true;
    if (mode === 'focused') f.document.activeElement = f.input;
    if (mode === 'invalid') f.input.value = '';
    f.fire('pointerdown', 100, mode === 'secondary' ? { button: 2 } : {});
    f.fire('pointermove', 120); f.fire('pointerup', 120);
    assert.equal(f.changes(), 0); assert.equal(f.input.capture, undefined);
  }
});

test('Enter finishes direct typing so the field can be dragged again', () => {
  const f = field();
  f.fire('pointerdown'); f.fire('pointerup');
  assert.equal(f.document.activeElement, f.input);
  f.fire('keydown', 100, { key: 'Enter' });
  f.fire('pointerdown'); f.fire('pointermove', 120); f.fire('pointerup', 120);
  assert.equal(Number(f.input.value), 90);
});
