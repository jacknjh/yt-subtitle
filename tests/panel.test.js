const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function panel({ read = async () => ({ json: '{"segments":[]}', wordCount: 1 }), failEvent = null, saveFile = async () => null } = {}) {
  const elements = new Map();
  const listeners = new Map();
  let lifecycle;
  const uxp = {
    host: { version: '26.2.2' },
    storage: { localFileSystem: { getFileForSaving: saveFile } },
    entrypoints: { setup: config => { lifecycle = config.panels.subtitleProbe; } },
  };
  const ppro = {
    Constants: { SequenceEvent: { ACTIVATED: 'sequence' }, ProjectEvent: { ACTIVATED: 'project' } },
    EventManager: {
      addGlobalEventListener(event, handler) {
        if (event === failEvent) throw new Error('Event unsupported');
        listeners.set(event, handler);
      },
      removeGlobalEventListener: event => listeners.delete(event),
    },
  };
  vm.runInNewContext(readFileSync(require.resolve('../prototype/main.js'), 'utf8'), {
    require: name => ({ premierepro: ppro, uxp, './probe.js': { readSequenceTranscript: read } })[name],
    document: { getElementById(id) {
      if (!elements.has(id)) elements.set(id, { disabled: false, value: '', addEventListener(type, callback) { this[type] = callback; } });
      return elements.get(id);
    } },
  });
  lifecycle.show();
  return { elements, listeners, lifecycle };
}

test('sequence activation discards an in-flight result and disables snapshot exports', async () => {
  let finish;
  const { elements, listeners } = panel({ read: () => new Promise(resolve => { finish = resolve; }) });
  const operation = elements.get('transcript').click();
  listeners.get('sequence')();
  finish({ json: '{"old":"sequence"}', wordCount: 1 });
  await operation;
  assert.equal(elements.get('report').value, '');
  assert.equal(elements.get('save-transcript').disabled, true);
  assert.equal(elements.get('transcript').disabled, false);
});

test('a failed transcript read can save diagnostics but cannot export stale transcript data', async () => {
  const { elements } = panel({ read: async () => { throw new Error('No transcript'); } });
  await elements.get('transcript').click();
  assert.match(elements.get('report').value, /No transcript/);
  assert.equal(elements.get('save-transcript').disabled, true);
  assert.equal(elements.get('save-report').disabled, false);
});

test('a file save error restores controls and is visible to the editor', async () => {
  const { elements } = panel({ saveFile: async () => ({ write: async () => { throw new Error('Disk full'); } }) });
  await elements.get('transcript').click();
  await elements.get('save-transcript').click();
  assert.match(elements.get('status').textContent, /Disk full/);
  assert.equal(elements.get('transcript').disabled, false);
});

test('a partial event subscription failure does not leak listeners', () => {
  const { listeners, lifecycle } = panel({ failEvent: 'project' });
  lifecycle.hide();
  assert.equal(listeners.size, 0);
});
