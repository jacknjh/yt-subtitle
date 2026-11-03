const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function host({ unsupportedText = false, failInsertAt = -1, templateExists = true, withoutJson = false, timebase = '8467200000' } = {}) {
  const original = { name: 'Original edit', sequenceID: 'original', importMGT() { assert.fail('must not insert into the original sequence'); } };
  const created = [];
  const project = { rootItem: {}, activeSequence: original,
    createNewSequence() { assert.fail('interactive sequence creation must not be used'); },
    openSequence() { return true; },
    newSequence(name, presetPath) {
    project.lastPresetPath = presetPath;
    const sequence = { name, sequenceID: 'proof', timebase, importMGT(path, ticks, trackIndex) {
      if (created.length === failInsertAt) return null;
      let text = unsupportedText ? 'unsupported data' : JSON.stringify({ textEditValue: 'Template', fontEditValue: ['Heebo'], fontTextRunLength: [8] });
      const controls = {
        Text: { getValue: () => text, setValue(value) { text = value; } },
        Animation: { setValue(value) { this.value = value; } },
        'Fit in Title Safe': { setValue(value) { this.value = value; } },
        'Paragraph Alignment': { setValue(value) { this.value = value; } },
        'Anchor X': { setValue(value) { this.value = value; } },
        'Type-On Opacity': { setValue(value) { this.value = value; } },
        'Active Word Opacity': { setValue(value) { this.value = value; } },
        'Box Opacity': { setValue(value) { this.value = value; } },
      };
      const clip = { trackIndex, start: { seconds: Number(ticks) / 254016000000 }, inPoint: { seconds: 0 },
        getMGTComponent: () => ({ properties: { getParamForDisplayName: name => controls[name] || null } }), controls,
      };
      created.push(clip);
      return clip;
    } };
    project.activeSequence = sequence;
    return sequence;
  } };
  const context = {
    app: { project }, JSON: withoutJson ? undefined : JSON, Date, Error, isFinite,
    File: function(path) { this.exists = templateExists; this.fsName = path.replace(/\//g, '\\'); this.parent = { fsName: require('node:path').resolve(__dirname, '../prototype/cep') }; },
    Time: function() { this.seconds = 0; Object.defineProperty(this, 'ticks', { get() { return String(this.seconds * 254016000000); }, set(value) { this.seconds = Number(value) / 254016000000; } }); },
  };
  context.$ = { fileName: require.resolve('../prototype/cep/host.jsx'), evalFile(path) { vm.runInContext(fs.readFileSync(path, 'utf8'), context); } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../prototype/cep/host.jsx'), 'utf8'), context);
  return { api: context.YTSubtitle, project, created, original };
}

const options = { templatePath: 'test.mogrt', presetPath: 'test.sqpreset' };

test('creates three adjacent editable word states while preserving template typography', () => {
  const { api, project, created, original } = host();
  const result = JSON.parse(api.createProof(options));
  assert.equal(result.ok, true);
  assert.notEqual(project.activeSequence, original);
  assert.equal(created.length, 3);
  assert.deepEqual(result.clips.map(c => c.text), ['I', 'I like', 'I like this']);
  assert.deepEqual(result.clips.map(c => [c.start, c.end]), [[0, 1], [1, 2], [2, 3]]);
  assert.deepEqual(created.map(c => c.trackIndex), [0, 0, 0]);
  for (const [index, clip] of created.entries()) {
    const value = JSON.parse(clip.controls.Text.getValue());
    assert.deepEqual(value.fontEditValue, ['Heebo']);
    assert.deepEqual(value.fontTextRunLength, [result.clips[index].text.length]);
    assert.equal(clip.controls.Animation.value, false);
    assert.equal(clip.controls['Paragraph Alignment'].value, 2);
    assert.equal(clip.controls['Anchor X'].value, 0);
    assert.equal(clip.controls['Type-On Opacity'].value, 100);
    assert.equal(clip.controls['Active Word Opacity'].value, 100);
    assert.equal(clip.controls['Box Opacity'].value, 0);
  }
});

test('checks required files before creating a test sequence', () => {
  const { api, project, original } = host({ templateExists: false });
  const result = JSON.parse(api.createProof(options));
  assert.equal(result.ok, false);
  assert.equal(project.activeSequence, original);
});

test('rejects unsupported text representations without guessing at binary data', () => {
  const { api, created } = host({ unsupportedText: true });
  const result = JSON.parse(api.createProof(options));
  assert.equal(result.ok, false);
  assert.match(result.error, /text representation/i);
  assert.equal(created.length, 1);
  assert.equal(created[0].controls.Text.getValue(), 'unsupported data');
});

test('reports partial results when insertion fails without touching the original edit', () => {
  const { api, created } = host({ failInsertAt: 1 });
  const result = JSON.parse(api.createProof(options));
  assert.equal(result.ok, false);
  assert.equal(result.clips.length, 1);
  assert.equal(created.length, 1);
  assert.match(result.sequenceName, /^Subtitle proof /);
});

test('loads the standard JSON polyfill on ExtendScript hosts without native JSON', () => {
  const { api } = host({ withoutJson: true });
  const result = JSON.parse(api.createProof(options));
  assert.equal(result.ok, true);
  assert.equal(result.clips.length, 3);
});

test('passes the native preset path to Premiere rather than slash-form input', () => {
  const { api, project } = host();
  const result = JSON.parse(api.createProof({ ...options, presetPath: 'presets/test.sqpreset' }));
  assert.equal(result.ok, true);
  assert.equal(project.lastPresetPath, 'presets\\test.sqpreset');
});

test('aligns adjacent word intervals to whole frames at 29.97 fps', () => {
  const { api } = host({ timebase: '8475667200' });
  const result = JSON.parse(api.createProof(options));
  assert.equal(result.ok, true);
  assert.equal(result.clips[1].start, 1.001);
  assert.equal(result.clips[2].start, 2.002);
  assert.equal(result.clips[0].end, result.clips[1].start);
  assert.equal(result.clips[1].end, result.clips[2].start);
  assert.equal(result.clips[2].end, 3.003);
});
