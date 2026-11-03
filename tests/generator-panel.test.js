const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { planTranscript } = require('../prototype/cep/planner');
const SubtitleAppearance = require('../prototype/cep/appearance');

function panel(respond) {
  const elements = {};
  const initial = { characters: '24', font: 'Heebo-SemiBold', 'font-size': '85', 'text-color': '#ebebeb', 'highlight-color': '#fffe00', 'position-x': '15', 'position-y': '80', animation: 'reveal-highlight' };
  const document = { createElement() { return {}; }, getElementById(id) {
    return elements[id] ||= { value: initial[id] || '', checked: false, textContent: '', disabled: false, events: {}, setAttribute(key, value) { this[key] = value; }, appendChild() {}, addEventListener(event, callback) { this.events[event] = callback; } };
  } };
  const calls = [];
  const context = vm.createContext({ document, planTranscript, SubtitleAppearance, setTimeout, window: {
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    proofConfig: { templatePath: 'template.mogrt' },
    __adobe_cep__: { evalScript(expression, callback) { calls.push(expression); callback(JSON.stringify(respond(expression, elements))); } },
  } });
  vm.runInContext(fs.readFileSync(require.resolve('../prototype/cep/main.js'), 'utf8'), context);
  const data = { segments: [{ words: Array.from({ length: 7 }, (_, i) => ({ text: 'word', start: i, duration: .5 })) }] };
  const source = { sequenceId: 'source', sequenceName: 'Edit', projectPath: 'edit.prproj', fps: 30 };
  return { elements, calls, accept() { context.acceptTranscript(JSON.stringify(data), source); } };
}

test('generates in small batches, reports completion and restores controls', async () => {
  let inserted = 0;
  const p = panel(expression => expression.startsWith('YTSubtitle.beginGeneration') ? { ok: true, sequenceId: 'copy', sequenceName: 'Copy' } : { ok: true, total: inserted += inserted ? 2 : 5 });
  assert.equal(p.elements.generate.disabled, true);
  p.accept();
  assert.equal(p.elements.generate.disabled, false);
  await p.elements.generate.events.click();
  assert.equal(p.calls.length, 3);
  assert.match(p.elements.status.textContent, /Done. 7 editable graphics/);
  assert.equal(p.elements.load.disabled, false);
  assert.equal(p.elements.cancel.disabled, true);
  assert.equal(p.elements['generation-progress'].value, 7);
  assert.equal(p.elements['generation-progress'].max, 7);
  assert.match(p.calls[0], /"appearance":\{"font":"Heebo-SemiBold"/);
});

test('stopping leaves completed batches and reports the partial result', async () => {
  const p = panel((expression, elements) => {
    if (expression.startsWith('YTSubtitle.beginGeneration')) return { ok: true, sequenceId: 'copy', sequenceName: 'Copy' };
    elements.cancel.events.click();
    return { ok: true, total: 5 };
  });
  p.accept();
  await p.elements.generate.events.click();
  assert.equal(p.calls.length, 2);
  assert.match(p.elements.status.textContent, /Stopped. 5 editable graphics/);
});

test('a host error reports the duplicate containing partial graphics', async () => {
  const p = panel(expression => expression.startsWith('YTSubtitle.beginGeneration') ? { ok: true, sequenceId: 'copy', sequenceName: 'Copy' } : { ok: false, error: 'Sequence changed' });
  p.accept();
  await p.elements.generate.events.click();
  assert.match(p.elements.status.textContent, /Sequence changed.*Partial graphics remain/);
  assert.equal(p.elements.load.disabled, false);
});

test('parent buttons call the playhead and latest-style APIs and enable sync only after success', async () => {
  const p = panel(expression => ({ ok: true, parentName: 'Subtitle 2: Hello', note: expression }));
  assert.equal(p.elements['apply-style'].disabled, true);
  await p.elements['capture-style'].events.click();
  assert.equal(p.calls[0], 'YTSubtitle.setParentFromPlayhead()');
  assert.equal(p.elements['apply-style'].disabled, false);
  await p.elements['apply-style'].events.click();
  assert.equal(p.calls[1], 'YTSubtitle.syncSelectedToParent()');
});

test('invalid appearance stops generation before any host mutation', async () => {
  const p = panel(() => { assert.fail('No host call expected'); });
  p.accept(); p.elements['font-size'].value = '999';
  await p.elements.generate.events.click();
  assert.match(p.elements.status.textContent, /size/);
  assert.equal(p.calls.length, 0);
});

test('a failed parent pick clears pending feedback and leaves sync disabled', async () => {
  const p = panel(() => ({ ok: false, error: 'Move the playhead over a subtitle.' }));
  await p.elements['capture-style'].events.click();
  assert.equal(p.elements['parent-status'].textContent, 'No parent set.');
  assert.equal(p.elements['apply-style'].disabled, true);
  assert.match(p.elements.status.textContent, /Move the playhead/);
});

test('invalid appearance pauses the preview so it can restart after correction', () => {
  const p = panel(() => ({ ok: true }));
  p.elements['preview-play'].events.click();
  assert.equal(p.elements['preview-play'].textContent, 'Pause preview');
  p.elements['font-size'].value = '0'; p.elements['font-size'].events.input();
  assert.equal(p.elements['preview-play'].textContent, 'Play preview');
  p.elements['font-size'].value = '85'; p.elements['font-size'].events.input();
  p.elements['preview-play'].events.click();
  assert.equal(p.elements['preview-play'].textContent, 'Pause preview');
});
