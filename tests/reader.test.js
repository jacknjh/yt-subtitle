const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handleRequest, sameIdentity, startReader } = require('../prototype/reader');
const context = { projectId: 'project-a', sequenceId: 'sequence-a', projectPath: 'D:\\Video\\edit.prproj' };
const request = { protocol: 1, type: 'readTranscript', id: 'request-1', readerSession: 'session-1', createdAt: 1000, context };
const options = { session: 'session-1', now: () => 1000, context: async () => context, read: async () => ({ ...context, json: '{"segments":[]}', wordCount: 1 }) };
test('returns the requested current transcript with request/session identity', async () => {
  const result = await handleRequest(request, options);
  assert.equal(result.ok, true); assert.equal(result.id, request.id); assert.equal(result.readerSession, 'session-1');
  assert(sameIdentity(context, { ...context, projectPath: 'd:/Video/edit.prproj' }));
  assert(sameIdentity(context, { ...context, projectPath: '//?/D:/Video/edit.prproj' }));
  assert(sameIdentity({ ...context, projectPath: '//?/UNC/Server/Share/edit.prproj' }, { ...context, projectPath: '//server/share/EDIT.prproj' }));
});
test('ignores expired requests and requests from a previous reader session', async () => {
  assert.equal(await handleRequest({ ...request, readerSession: 'old' }, options), null);
  assert.equal(await handleRequest({ ...request, createdAt: -20000 }, options), null);
});
test('rejects mismatched sequences before exporting and switches during export', async () => {
  const wrong = { ...context, sequenceId: 'sequence-b' };
  const result = await handleRequest(request, { ...options, context: async () => wrong, read: async () => assert.fail('must not read wrong sequence') });
  assert.equal(result.ok, false);
  let current = context;
  const switched = await handleRequest(request, { ...options, context: async () => current, read: async () => { current = wrong; return { ...context, json: '{}' }; } });
  assert.equal(switched.ok, false); assert.match(switched.error, /changed/);
});
test('reports a missing native transcript without inventing a source-clip fallback', async () => {
  const result = await handleRequest(request, { ...options, read: async () => { throw Error('No sequence transcript'); } });
  assert.equal(result.ok, false); assert.match(result.error, /No sequence transcript/);
});

test('background service writes a heartbeat, replies once and stops scheduling after shutdown', async () => {
  const files = new Map();
  let next, cancelled = false, reads = 0;
  const service = await startReader({
    fs: { async getDataFolder() { return { nativePath: 'private-data', async createFile(name) {
      const file = { value: '', async write(value) { this.value = value; }, async read() { return this.value; } };
      files.set(name, file); return file;
    } }; } },
    context: options.context, read: async () => { reads++; return options.read(); }, now: () => 10000,
    schedule(callback) { next = callback; return 1; }, unschedule() { cancelled = true; },
  });
  const heartbeat = JSON.parse(files.get('reader.json').value);
  assert.equal(heartbeat.updatedAt, 10000);
  await files.get('request.json').write(JSON.stringify({ ...request, createdAt: 10000, readerSession: heartbeat.readerSession }));
  await next();
  assert.equal(JSON.parse(files.get('response.json').value).ok, true);
  await next();
  assert.equal(reads, 1);
  service.stop();
  assert.equal(cancelled, true);
});
