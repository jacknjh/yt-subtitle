const ppro = require('premierepro');
const uxp = require('uxp');
const { activeContext, readSequenceTranscript, inspectSelectedGraphic } = require('./probe.js');
const { startReader } = require('./reader.js');
const element = id => document.getElementById(id);
let report = null;
let transcript = null;
let busy = false;
let revision = 0;
const registeredEvents = [];
let readerService = null;
if (typeof uxp.storage.localFileSystem.getDataFolder === 'function') {
  startReader({ fs: uxp.storage.localFileSystem, context: () => activeContext(ppro), read: () => readSequenceTranscript(ppro), onStatus: message => { element('reader-status').textContent = message; } })
    .then(service => { readerService = service; })
    .catch(error => { element('reader-status').textContent = 'Reader could not start: ' + String(error.message || error); });
}

function updateButtons() {
  element('transcript').disabled = busy;
  element('graphic').disabled = busy;
  element('save-report').disabled = busy || !report;
  element('save-transcript').disabled = busy || !transcript;
}

function invalidate() {
  revision++;
  report = null;
  transcript = null;
  element('report').value = '';
  element('status').textContent = 'Sequence or project changed. Run a check for the active sequence.';
  updateButtons();
}

async function run(operation) {
  if (busy) return;
  busy = true;
  const startedAt = revision;
  report = null;
  transcript = null;
  element('report').value = '';
  element('status').textContent = 'Reading Premiere data…';
  updateButtons();
  try {
    const result = await operation(ppro);
    if (startedAt !== revision) return;
    const { json, ...details } = result;
    transcript = json || null;
    report = {
      checkedAt: new Date().toISOString(),
      hostVersion: uxp.host.version,
      mogrtTextApiExposed: typeof ppro.MogrtText === 'function',
      ...details,
    };
    element('report').value = JSON.stringify(report, null, 2);
    element('status').textContent = json
      ? `Read ${result.wordCount} words. Compare exported timings with playback; timing is not yet verified.`
      : 'Inspection complete. Parameter reads do not prove editing support.';
  } catch (error) {
    if (startedAt !== revision) return;
    report = { checkedAt: new Date().toISOString(), hostVersion: uxp.host.version, error: String(error.message || error) };
    element('report').value = JSON.stringify(report, null, 2);
    element('status').textContent = report.error;
  } finally {
    busy = false;
    updateButtons();
  }
}

async function save(kind) {
  if (busy) return;
  const content = kind === 'transcript' ? transcript : report && JSON.stringify(report, null, 2);
  if (!content) return;
  busy = true;
  updateButtons();
  try {
    const file = await uxp.storage.localFileSystem.getFileForSaving(`subtitle-${kind}.json`, { types: ['json'] });
    if (!file) return;
    await file.write(content);
    element('status').textContent = 'Saved the captured snapshot.';
  } catch (error) {
    element('status').textContent = `Could not save: ${error.message || error}`;
  } finally {
    busy = false;
    updateButtons();
  }
}

function unsubscribe() {
  while (registeredEvents.length) {
    const event = registeredEvents.pop();
    ppro.EventManager.removeGlobalEventListener(event, invalidate, false);
  }
}

element('transcript').addEventListener('click', () => run(readSequenceTranscript));
element('graphic').addEventListener('click', () => run(inspectSelectedGraphic));
element('save-report').addEventListener('click', () => save('report'));
element('save-transcript').addEventListener('click', () => save('transcript'));

uxp.entrypoints.setup({ plugin: { destroy() { if (readerService) readerService.stop(); unsubscribe(); } }, panels: { subtitleProbe: {
  show() {
    if (registeredEvents.length) return;
    try {
      for (const event of [ppro.Constants.SequenceEvent.ACTIVATED, ppro.Constants.ProjectEvent.ACTIVATED]) {
        ppro.EventManager.addGlobalEventListener(event, invalidate, false);
        registeredEvents.push(event);
      }
    } catch (error) {
      unsubscribe();
      element('status').textContent = `Sequence events unavailable: ${error.message || error}. Checks still verify the active sequence before returning.`;
    }
  },
  hide() {
    invalidate();
    unsubscribe();
  },
} } });
