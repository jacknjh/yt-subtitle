const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { planTranscript } = require('../prototype/cep/planner');
const SubtitleAppearance = require('../prototype/cep/appearance');

function panel(respond) {
  const elements = {};
  const initial = { characters: '24', font: 'Heebo-SemiBold', 'font-size': '85', 'text-color': '#ebebeb', 'highlight-color': '#fffe00', 'text-color-hex': '#ebebeb', 'highlight-color-hex': '#fffe00', 'position-x': '15', 'position-y': '80', animation: 'reveal-highlight' };
  const document = { createElement() { return {}; }, getElementById(id) {
    return elements[id] ||= { value: initial[id] || '', checked: false, textContent: '', disabled: false, events: {}, setAttribute(key, value) { this[key] = value; }, focus() { this.focused = true; }, appendChild() {}, addEventListener(event, callback) { this.events[event] = callback; } };
  } };
  const calls = [];
  const context = vm.createContext({ document, planTranscript, SubtitleAppearance, createTranscriptSessions: require('../prototype/cep/sessions'), setTimeout, clearTimeout, window: {
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    SubtitleFonts: [{ postscript: 'Example-Bold', label: 'Example Bold', family: 'Example', style: 'Bold' }],
    proofConfig: { templatePath: 'template.mogrt' },
    __adobe_cep__: { getSystemPath: () => 'file:///C:/Extension%20folder', evalScript(expression, callback) { calls.push(expression); const report = respond(expression, elements); callback(typeof report === 'string' ? report : JSON.stringify(report)); } },
  } });
  vm.runInContext(fs.readFileSync(require.resolve('../prototype/cep/main.js'), 'utf8'), context);
  const data = { segments: [{ words: Array.from({ length: 7 }, (_, i) => ({ text: 'word', start: i, duration: .5 })) }] };
  const source = { sequenceId: 'source', sequenceName: 'Edit', projectPath: 'edit.prproj', fps: 30 };
  return { elements, calls, context, data, source, accept() { context.acceptTranscript(JSON.stringify(data), source); } };
}

test('generates in small batches, reports completion and restores controls', async () => {
  let inserted = 0;
  const p = panel(expression => expression.includes('YTSubtitle.beginGeneration(') ? { ok: true, sequenceId: 'copy', sequenceName: 'Copy' } : { ok: true, total: inserted += inserted ? 2 : 5 });
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

test('pausing keeps the frozen plan and resumes from the next unfinished word', async () => {
  let inserted = 0, begins = 0;
  const p = panel((expression, elements) => {
    if (expression.includes('YTSubtitle.beginGeneration(')) { begins++; return { ok: true, sequenceId: 'source', sequenceName: 'Edit' }; }
    if (!inserted) { elements.cancel.events.click(); inserted = 5; }
    else { assert.match(expression, /"startFrame":150/); inserted = 7; }
    return { ok: true, total: inserted };
  });
  p.accept();
  await p.elements.generate.events.click();
  assert.equal(p.calls.length, 2);
  assert.match(p.elements.status.textContent, /Paused.*5/);
  assert.equal(p.elements.resume.disabled, false);
  p.elements.characters.value = '1';
  await p.elements.resume.events.click();
  assert.equal(begins, 1);
  assert.equal(inserted, 7);
  assert.match(p.elements.status.textContent, /Done/);
  assert.equal(p.elements.resume.hidden, true);
});

test('a host error reports the timeline containing partial graphics', async () => {
  const p = panel(expression => expression.includes('YTSubtitle.beginGeneration(') ? { ok: true, sequenceId: 'copy', sequenceName: 'Copy' } : { ok: false, error: 'Sequence changed' });
  p.accept();
  await p.elements.generate.events.click();
  assert.match(p.elements.status.textContent, /Sequence changed.*Partial graphics remain/);
  assert.equal(p.elements.load.disabled, false);
});

test('a mid-batch sequence switch resumes using the native completed count', async () => {
  let batches = 0;
  const p = panel(expression => {
    if (expression.includes('YTSubtitle.beginGeneration(')) return { ok: true, sequenceId: 'source', sequenceName: 'Edit' };
    batches++;
    if (batches === 1) return { ok: true, paused: true, note: 'Return to Edit.', total: 2 };
    assert.match(expression, /"startFrame":60/);
    return { ok: true, total: 7 };
  });
  p.accept();
  await p.elements.generate.events.click();
  assert.equal(p.elements['generation-progress'].value, 2);
  await p.elements.resume.events.click();
  assert.equal(batches, 2);
  assert.equal(p.elements['generation-progress'].value, 7);
});

test('discard forgets the pending run without deleting completed timeline graphics', async () => {
  const p = panel(expression => expression.includes('YTSubtitle.beginGeneration(') ? { ok: true, sequenceId: 'source', sequenceName: 'Edit' } : { ok: true, paused: true, total: 2 });
  p.accept(); await p.elements.generate.events.click();
  const calls = p.calls.length;
  p.elements['discard-run'].events.click();
  assert.equal(p.calls.length, calls);
  assert.equal(p.elements.resume.hidden, true);
  assert.equal(p.elements.generate.disabled, false);
});

test('parent buttons call the playhead and latest-style APIs and enable sync only after success', async () => {
  const p = panel(expression => ({ ok: true, parentName: 'Subtitle 2: Hello', note: expression }));
  assert.equal(p.elements['apply-style'].disabled, true);
  await p.elements['capture-style'].events.click();
  assert(p.calls[0].endsWith('YTSubtitle.setParentFromPlayhead()'));
  assert.equal(p.elements['apply-style'].disabled, false);
  await p.elements['apply-style'].events.click();
  assert(p.calls[1].endsWith('YTSubtitle.syncSelectedToParent()'));
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

test('tabs preserve settings and support arrow-key navigation while pausing hidden previews', () => {
  const p = panel(() => ({ ok: true }));
  p.elements['font-size'].value = '100';
  p.elements['tab-style'].events.click();
  assert.equal(p.elements['panel-style'].hidden, false);
  assert.equal(p.elements['panel-generate'].hidden, true);
  p.elements['tab-content'].scrollTop = 120;
  p.elements['preview-play'].events.click();
  p.elements['tab-style'].events.keydown({ key: 'ArrowRight', preventDefault() {} });
  assert.equal(p.elements['tab-edit']['aria-selected'], 'true');
  assert.equal(p.elements['tab-edit'].focused, true);
  assert.equal(p.elements['preview-play'].textContent, 'Play preview');
  assert.equal(p.elements['tab-content'].scrollTop, 0);
  p.elements['tab-style'].events.click();
  assert.equal(p.elements['tab-content'].scrollTop, 120);
  assert.equal(p.elements['font-size'].value, '100');
});

test('hex color fields update the swatch and native picker changes update the hex field', () => {
  const p = panel(() => ({ ok: true }));
  p.elements['text-color-hex'].value = '#123456'; p.elements['text-color-hex'].events.input();
  assert.equal(p.elements['text-color'].value, '#123456');
  p.elements['text-color'].value = '#abcdef'; p.elements['text-color'].events.change();
  assert.equal(p.elements['text-color-hex'].value, '#abcdef');
  p.elements['text-color-hex'].value = '#bad'; p.elements['text-color-hex'].events.input();
  assert.equal(p.elements['text-color-hex']['aria-invalid'], 'true');
  assert.match(p.elements.status.textContent, /color/);
});

test('font search preserves the chosen font until a different face is selected', () => {
  const p = panel(() => ({ ok: true }));
  p.elements['font-search'].value = 'Example'; p.elements['font-search'].events.input();
  assert.equal(p.elements.font.value, 'Heebo-SemiBold');
  assert.match(p.elements['font-status'].textContent, /1 matching/);
  p.elements.font.value = 'Example-Bold'; p.elements.font.events.change();
  assert.match(p.elements.status.textContent, /Appearance updated/);
});

test('host calls initialize dependencies from the extension path before the requested operation', async () => {
  const p = panel(() => ({ ok: true, cancelled: true }));
  await p.elements.load.events.click();
  assert.match(p.calls[0], /YTSubtitle\.initialize\("file:\/\/\/C:\/Extension%20folder"\);YTSubtitle\.loadTranscript/);
  assert.match(p.elements.status.textContent, /No JSON file selected/);
  assert.equal(p.elements.generate.disabled, true);
});

test('native startup errors display recovery instructions instead of a JSON parsing error', async () => {
  const p = panel(() => 'EvalScript error.');
  await p.elements.load.events.click();
  assert.match(p.elements.status.textContent, /could not connect to Premiere/);
  assert.doesNotMatch(p.elements.status.textContent, /Unexpected token/);
});

test('automatic refresh loads Premiere words and blocks generation when the latest read fails', async () => {
  const source = { projectId: 'project', projectPath: 'edit.prproj', sequenceId: 'source', sequenceName: 'Edit', fps: 30 };
  let fail = false, writes = 0;
  const p = panel(expression => {
    if (expression.includes('YTSubtitle.getContext(')) return { ok: true, context: source };
    if (expression.includes('YTSubtitle.readSession(')) return { ok: true, session: null };
    if (expression.includes('YTSubtitle.requestTranscript(')) return fail ? { ok: false, error: 'Reader unavailable' } : { ok: true, requestId: 'request' };
    if (expression.includes('YTSubtitle.pollTranscript(')) return { ok: true, context: source, json: JSON.stringify(p.data), capturedAt: Date.now() };
    if (expression.includes('YTSubtitle.writeSession(')) { writes++; return { ok: true }; }
    assert.fail('Unexpected host operation: ' + expression);
  });
  await p.elements['refresh-transcript'].events.click();
  assert.equal(p.elements.generate.disabled, false);
  assert.match(p.elements['transcript-source'].textContent, /Current Premiere transcript/);
  assert.equal(writes, 1);
  fail = true;
  await p.elements['refresh-transcript'].events.click();
  assert.equal(p.elements.generate.disabled, true);
  assert.match(p.elements.status.textContent, /Reader unavailable/);
  assert.match(p.elements['transcript-source'].textContent, /snapshot/);
});

test('manual chooser remains usable when the automatic reader is unavailable', async () => {
  const p = panel(expression => {
    if (expression.includes('YTSubtitle.loadTranscript(')) return { ok: true, context: { ...p.source, projectId: 'project' }, json: JSON.stringify(p.data) };
    if (expression.includes('YTSubtitle.readSession(')) return { ok: true, session: null };
    if (expression.includes('YTSubtitle.writeSession(')) return { ok: true };
    assert.fail('Manual choice must not request the reader: ' + expression);
  });
  await p.elements.load.events.click();
  assert.equal(p.elements.generate.disabled, false);
  assert.match(p.elements['transcript-source'].textContent, /Manual JSON snapshot/);
});
