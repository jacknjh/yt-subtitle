const { test } = require('node:test');
const assert = require('node:assert/strict');
const createSessions = require('../prototype/cep/sessions');
const identity = require('../prototype/identity');
const a = { projectId: 'project-a', projectPath: 'D:/edit.prproj', sequenceId: 'a' };
const b = { ...a, sequenceId: 'b' };
function fixture(store = new Map(), read = async context => ({ context, json: context.sequenceId, capturedAt: 1000 })) {
  let settings = { font: 'default' };
  const events = [], errors = [];
  const manager = createSessions({
    settings: () => ({ ...settings }), defaults: () => { settings = { font: 'default' }; }, apply: saved => { settings = { ...saved }; },
    restore: async context => store.get(identity.key(context)), save: async record => store.set(identity.key(record.context), JSON.parse(JSON.stringify(record))), read,
    context: context => events.push(['context', context]), reading() {}, transcript: (data, context, flags) => events.push(['transcript', context.sequenceId, data.json, flags.fresh]), error: error => errors.push(error.message),
  });
  return { manager, events, errors, store, setFont: value => { settings.font = value; }, font: () => settings.font };
}
test('restores each sequence appearance and reads fresh transcript after reopening', async () => {
  const f = fixture(); await f.manager.activate(a); f.setFont('Arial'); await f.manager.activate(b);
  assert.equal(f.font(), 'default'); f.setFont('Heebo'); await f.manager.save();
  const reopened = fixture(f.store); await reopened.manager.activate(a); assert.equal(reopened.font(), 'Arial');
  assert.deepEqual(reopened.events.filter(e => e[0] === 'transcript').map(e => e[3]), [false, true]);
  await reopened.manager.activate(b); assert.equal(reopened.font(), 'Heebo');
});
test('discards an automatic reply after switching sequences', async () => {
  let finish, started;
  const waiting = new Promise(resolve => { started = resolve; });
  const f = fixture(new Map(), context => context.sequenceId === 'a' ? new Promise(resolve => { finish = resolve; started(); }) : Promise.resolve({ context, json: 'b' }));
  const pending = f.manager.activate(a); await waiting; await f.manager.activate(b); finish({ context: a, json: 'old-a' }); await pending;
  assert.equal(f.events.some(e => e[0] === 'transcript' && e[2] === 'old-a'), false);
  assert.equal(f.manager.context().sequenceId, 'b');
});
test('manual JSON cancels pending automatic read and remains a manual source on reopen', async () => {
  let finish, started; const waiting = new Promise(resolve => { started = resolve; });
  const f = fixture(new Map(), context => new Promise(resolve => { finish = resolve; started(); }));
  const pending = f.manager.activate(a); await waiting; await f.manager.manual('chosen-json', a); finish({ context: a, json: 'automatic' }); await pending;
  const reopened = fixture(f.store, () => assert.fail('Manual override must not be silently replaced'));
  await reopened.manager.activate(a);
  assert(reopened.events.some(e => e[2] === 'chosen-json' && e[3] === true));
});
test('missing native transcript leaves the cached transcript explicitly stale', async () => {
  const f = fixture(); await f.manager.activate(a);
  const reopened = fixture(f.store, async () => { throw Error('No sequence transcript'); });
  await reopened.manager.activate(a);
  assert.deepEqual(reopened.events.filter(e => e[0] === 'transcript').map(e => e[3]), [false]);
  assert.match(reopened.errors[0], /No sequence transcript/);
});
test('does not restore snapshots from another project file or accept mismatched replies', async () => {
  const f = fixture(new Map(), async () => ({ context: b, json: 'wrong' }));
  f.store.set(identity.key(a), { schema: 1, context: { ...a, projectPath: 'D:/other.prproj' }, settings: { font: 'wrong' }, json: 'wrong', source: 'manual' });
  await f.manager.activate(a); assert.equal(f.font(), 'default');
  assert.equal(f.events.some(e => e[0] === 'transcript'), false); assert.match(f.errors[0], /different project or sequence/);
});

test('manual loading supersedes an in-flight cache restore', async () => {
  let finish, started; const waiting = new Promise(resolve => { started = resolve; });
  const events = [];
  const manager = createSessions({ settings: () => ({}), defaults() {}, apply() {}, save: async () => {}, context() {}, reading() {}, error() {},
    restore: () => new Promise(resolve => { finish = resolve; started(); }),
    read: () => assert.fail('Old restore must not start an automatic read'), transcript: data => events.push(data.json),
  });
  const pending = manager.activate(a); await waiting; await manager.manual('manual-new', a);
  finish({ schema: 1, context: a, source: 'manual', json: 'cached-old', settings: {} }); await pending;
  assert.deepEqual(events, ['manual-new']);
});
