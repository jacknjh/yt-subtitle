const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const identity = require('../prototype/identity'), appearance = require('../prototype/cep/appearance');
const a = { projectId: 'project-a', sequenceId: 'sequence-a', projectPath: 'D:/edit.prproj' };
function fixture() {
  const files = new Map(), folders = new Set(), norm = value => String(value).replace(/\\/g, '/');
  function Folder(value) { this.fsName = norm(value); this.name = this.fsName.split('/').pop(); Object.defineProperty(this, 'exists', { get: () => folders.has(this.fsName) }); }
  Folder.userData = { fsName: 'C:/UserData' };
  Folder.prototype.create = function() { folders.add(this.fsName); return true; };
  Folder.prototype.getFiles = function() { return [...folders].filter(path => path.startsWith(this.fsName + '/') && !path.slice(this.fsName.length + 1).includes('/')).map(path => new Folder(path)); };
  function File(value) { this.fsName = norm(value); Object.defineProperty(this, 'exists', { get: () => files.has(this.fsName) }); }
  File.prototype.open = function(mode) { return mode !== 'r' || this.exists; };
  File.prototype.close = function() {};
  File.prototype.read = function() { return files.get(this.fsName); };
  File.prototype.write = function(value) { files.set(this.fsName, value); return true; };
  const context = vm.createContext({ File, Folder, JSON, SubtitleIdentity: identity, SubtitleAppearance: appearance, app: { version: '26.2.2' } });
  vm.runInContext(fs.readFileSync(require.resolve('../prototype/cep/bridge.jsx'), 'utf8'), context);
  let current = a;
  const bridge = context.createSubtitleBridge(() => current);
  const root = 'C:/UserData/Adobe/UXP/PluginsStorage/PPRO/26/External';
  const reader = root + '/local.ytsubtitle.reader/PluginData';
  folders.add(root); folders.add(root + '/local.ytsubtitle.reader'); folders.add(reader);
  files.set(reader + '/reader.json', JSON.stringify({ protocol: 1, readerSession: 'reader-1', updatedAt: Date.now() }));
  return { bridge, files, reader, switch: value => { current = value; } };
}
test('mailbox accepts only the matching request, reader session and active sequence', () => {
  const f = fixture(); const ticket = JSON.parse(f.bridge.requestTranscript(a)); assert.equal(ticket.ok, true);
  const request = JSON.parse(f.files.get(f.reader + '/request.json')); assert.equal(request.context.sequenceId, a.sequenceId);
  f.files.set(f.reader + '/response.json', JSON.stringify({ protocol: 1, id: 'old', readerSession: 'reader-1' }));
  assert.equal(JSON.parse(f.bridge.pollTranscript(ticket.requestId)).pending, true);
  f.files.set(f.reader + '/response.json', JSON.stringify({ protocol: 1, id: ticket.requestId, readerSession: 'reader-1', ok: true, context: a, json: '{}' }));
  assert.equal(JSON.parse(f.bridge.pollTranscript(ticket.requestId)).json, '{}');
});
test('sequence switches and expired readers cannot deliver transcripts', () => {
  const f = fixture(); const ticket = JSON.parse(f.bridge.requestTranscript(a)); f.switch({ ...a, sequenceId: 'b' });
  assert.equal(JSON.parse(f.bridge.pollTranscript(ticket.requestId)).ok, false);
  f.switch(a); f.files.set(f.reader + '/reader.json', JSON.stringify({ protocol: 1, readerSession: 'old', updatedAt: Date.now() - 60000 }));
  assert.equal(JSON.parse(f.bridge.requestTranscript(a)).ok, false);
});
test('cached settings are scoped to project path and sequence, and corrupt snapshots are ignored', () => {
  const f = fixture(); const session = { schema: 1, context: a, settings: { appearance: appearance.defaults(), characters: 24, singleWord: false }, source: 'premiere', json: '{}', capturedAt: 1 };
  assert.equal(JSON.parse(f.bridge.writeSession(session)).ok, true);
  assert.equal(JSON.parse(f.bridge.readSession(a)).session.settings.characters, 24);
  assert.equal(JSON.parse(f.bridge.readSession({ ...a, projectPath: 'D:/copy.prproj' })).session, null);
  assert.equal(JSON.parse(f.bridge.readSession({ ...a, sequenceId: 'b' })).session, null);
  const name = [...f.files.keys()].find(path => path.includes('/sessions/')); f.files.set(name, 'broken');
  assert.equal(JSON.parse(f.bridge.readSession(a)).session, null);
  assert.equal(JSON.parse(f.bridge.writeSession({ ...session, context: { ...a, sequenceId: '../outside' } })).ok, false);
});
