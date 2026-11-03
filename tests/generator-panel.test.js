const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { planTranscript } = require('../prototype/cep/planner');

function panel(respond) {
  const elements = {};
  const document = { getElementById(id) {
    return elements[id] ||= { value: id === 'characters' ? '24' : '', checked: false, textContent: '', disabled: false, events: {}, addEventListener(event, callback) { this.events[event] = callback; } };
  } };
  const calls = [];
  const context = vm.createContext({ document, planTranscript, setTimeout, window: {
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
