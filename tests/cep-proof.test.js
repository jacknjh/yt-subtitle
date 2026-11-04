const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function host({ unsupportedText = false, failInsertAt = -1, templateExists = true, withoutJson = false, initialize = true, timebase = '8467200000' } = {}) {
  const original = { name: 'Original edit', sequenceID: 'original', importMGT() { assert.fail('must not insert into the original sequence'); } };
  const created = [];
  const imported = [];
  const project = { rootItem: {}, activeSequence: original,
    createNewSequence() { assert.fail('interactive sequence creation must not be used'); },
    openSequence() { return true; },
    newSequence(name, presetPath) {
    project.lastPresetPath = presetPath;
    function makeClip(path, ticks, trackIndex) {
      if (created.length === failInsertAt) return null;
      let text = unsupportedText ? 'unsupported data' : JSON.stringify({ textEditValue: 'Template', fontEditValue: ['Heebo'], fontSizeEditValue: [85], fontTextRunLength: [8] });
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
      for (const name of ['Characters Per Line', 'Offset', 'Size', 'Anchor Y', 'Line Spacing', 'Character Spacing', 'Word Spacing', 'Stroke Width', 'Active Word Stroke On/Off', 'Box Padding', 'Box Offset', 'Box Stroke Width', 'Box Roundness']) controls[name] = { value: 1, setValue(value) { this.value = value; } };
      controls.Size.value = [100/1920,100/1080];
      for (const name of ['Fill Color', 'Stroke Color', 'Active Word Color', 'Box Fill', 'Box Stroke']) controls[name] = { value: [1,255,255,255], getColorValue() { return this.value; }, setColorValue(a,r,g,b) { this.value = [a,r,g,b]; } };
      for (const control of Object.values(controls)) {
        control.isTimeVarying = () => false;
        if (!control.getValue) control.getValue = function() { return this.value; };
      }
      const clip = { nodeId: 'clip-' + created.length, projectItem: {}, trackIndex, start: { seconds: Number(ticks) / 254016000000 }, inPoint: { seconds: 0 },
        getMGTComponent: () => ({ properties: { getParamForDisplayName: name => controls[name] || null } }), controls,
      };
      created.push(clip);
      return clip;
    }
    const sequence = { name, sequenceID: 'proof', timebase, importMGT(path, ticks, trackIndex) { imported.push(path); return makeClip(path, ticks, trackIndex); } };
    project.activeSequence = sequence;
    sequence.videoTracks = { numTracks: 2, 0: { clips: { numItems: 0 } }, 1: { clips: created, overwriteClip(item, seconds) { return !!makeClip('reuse', String(seconds * 254016000000), 1); } } };
    Object.defineProperty(created, 'numItems', { configurable: true, get() { return created.length; } });
    sequence.getSelection = () => sequence.selection || [];
    sequence.getPlayerPosition = () => ({ seconds: sequence.playhead || 0 });
    return sequence;
  } };
  const context = {
    app: { project }, JSON: withoutJson ? undefined : JSON, Date, Error, isFinite,
    File: function(path) { this.fullName = path; this.exists = templateExists; this.fsName = path.replace(/\//g, '\\'); this.parent = { fsName: require('node:path').resolve(__dirname, '../prototype/cep') }; },
    Time: function() { this.seconds = 0; Object.defineProperty(this, 'ticks', { get() { return String(this.seconds * 254016000000); }, set(value) { this.seconds = Number(value) / 254016000000; } }); },
  };
  context.$ = { fileName: '', evalFile(file) {
    let name = file.fullName || file;
    if (require('node:path').basename(name) === 'identity.js') name = require.resolve('../prototype/identity.js');
    vm.runInContext(fs.readFileSync(name, 'utf8'), context);
  } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../prototype/cep/host.jsx'), 'utf8'), context);
  if (initialize) context.YTSubtitle.initialize(require('node:path').resolve(__dirname, '../prototype/cep'));
  original.timebase = timebase;
  const editable = project.newSequence('fixture', 'unused');
  original.importMGT = editable.importMGT;
  original.videoTracks = editable.videoTracks;
  original.getSelection = () => original.selection || [];
  original.getPlayerPosition = () => ({ seconds: original.playhead || 0 });
  project.activeSequence = original;
  project.path = 'test.prproj';
  project.sequences = { 0: original, numSequences: 1 };
  original.clone = () => {
    const copy = project.newSequence('copy', 'unused');
    project.sequences[project.sequences.numSequences++] = copy;
    return true;
  };
  return { api: context.YTSubtitle, project, created, imported, original };
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
    assert.equal(clip.controls['Characters Per Line'].value, 200);
    assert.deepEqual(Array.from(clip.controls.Offset.value), [-.35, .3]);
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

test('fresh startup does not need $.fileName and dependencies load through explicit initialization', () => {
  const { api } = host({ withoutJson: true, initialize: false });
  assert.equal(JSON.parse(api.createProof(options)).ok, false);
  api.initialize(require('node:path').resolve(__dirname, '../prototype/cep'));
  assert.equal(JSON.parse(api.createProof(options)).ok, true);
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

test('generates directly in the active sequence using an empty track without cloning', () => {
  const { api, project, created, original } = host();
  const result = JSON.parse(api.beginGeneration({ ...options, sequenceId: 'original', projectPath: 'test.prproj' }));
  assert.equal(result.ok, true);
  assert.equal(project.activeSequence, original);
  assert.equal(project.sequences.numSequences, 1);
  assert.equal(result.trackIndex, 1);
  const inserted = JSON.parse(api.insertBatch(result.sequenceId, [{ text: 'Hello', phraseIndex: 0, startFrame: 15, endFrame: 21 }]));
  assert.equal(inserted.ok, true);
  assert.equal(inserted.total, 1);
  assert.equal(created[0].start.seconds, .5);
  assert.equal(created[0].end.seconds, .7);
  assert.equal(created[0].trackIndex, 1);
});

test('blocks stale data, occupied output tracks and existing phrase groups before writes', () => {
  const { api, project, original } = host();
  assert.equal(JSON.parse(api.beginGeneration({ ...options, sequenceId: 'wrong', projectPath: 'test.prproj' })).ok, false);
  const emptyClips = original.videoTracks[1].clips;
  original.videoTracks[1].clips = { numItems: 1 };
  const result = JSON.parse(api.beginGeneration({ ...options, sequenceId: 'original', projectPath: 'test.prproj' }));
  assert.equal(result.ok, false);
  assert.match(result.error, /empty video track/);
  assert.equal(project.sequences.numSequences, 1);
  original.videoTracks[1].clips = emptyClips;
  original.videoTracks[0].clips = { 0: { name: 'Subtitle 1: existing' }, numItems: 1 };
  const alreadyGenerated = JSON.parse(api.beginGeneration({ ...options, sequenceId: 'original', projectPath: 'test.prproj' }));
  assert.equal(alreadyGenerated.ok, false);
  assert.match(alreadyGenerated.error, /already contains generated subtitles/);
  assert.equal(project.sequences.numSequences, 1);
});

test('pauses on another sequence and resumes without repeating completed word graphics', () => {
  const { api, project, original, created } = host();
  const result = JSON.parse(api.beginGeneration({ ...options, sequenceId: 'original', projectPath: 'test.prproj' }));
  const words = [0, 1].map(i => ({ text: 'word' + i, phraseIndex: 0, startFrame: i * 30, endFrame: (i + 1) * 30 }));
  const insert = original.importMGT;
  original.importMGT = function() { const clip = insert.apply(this, arguments); project.activeSequence = { sequenceID: 'other' }; return clip; };
  const partial = JSON.parse(api.insertBatch(result.sequenceId, words));
  assert.equal(partial.ok, true); assert.equal(partial.paused, true); assert.equal(partial.total, 1);
  assert.equal(created.length, 1);
  project.activeSequence = original;
  const resumed = JSON.parse(api.insertBatch(result.sequenceId, words.slice(partial.total)));
  assert.equal(resumed.ok, true); assert.equal(resumed.total, 2);
  assert.equal(created.length, 2);
});

test('rejects invalid intervals without inserting clips', () => {
  const { api, created } = host();
  const next = JSON.parse(api.beginGeneration({ ...options, sequenceId: 'original', projectPath: 'test.prproj' }));
  assert.equal(JSON.parse(api.insertBatch(next.sequenceId, [{ text: 'Hello', phraseIndex: 0, startFrame: 2, endFrame: 1 }])).ok, false);
  assert.equal(created.length, 0);
});

test('refuses further writes when the output track has been edited while paused', () => {
  const { api, created } = host();
  const r = JSON.parse(api.beginGeneration({ ...options, sequenceId: 'original', projectPath: 'test.prproj' }));
  api.insertBatch(r.sequenceId, [{ text: 'Hello', phraseIndex: 0, startFrame: 0, endFrame: 30 }]);
  created[0].end.seconds = 2;
  const blocked = JSON.parse(api.insertBatch(r.sequenceId, [{ text: 'world', phraseIndex: 0, startFrame: 30, endFrame: 60 }]));
  assert.equal(blocked.ok, true); assert.equal(blocked.paused, true); assert.match(blocked.note, /track.*changed/i);
  assert.equal(created.length, 1);
  created[0].end.seconds = 1;
  assert.equal(JSON.parse(api.insertBatch(r.sequenceId, [{ text: 'world', phraseIndex: 0, startFrame: 30, endFrame: 60 }])).total, 2);
});

test('another project with the same sequence ID cannot receive resumed graphics', () => {
  const { api, project, created } = host();
  project.documentID = 'first-project';
  const r = JSON.parse(api.beginGeneration({ ...options, sequenceId: 'original', projectPath: 'test.prproj' }));
  project.documentID = 'second-project';
  const result = JSON.parse(api.insertBatch(r.sequenceId, [{ text: 'Hello', phraseIndex: 0, startFrame: 0, endFrame: 30 }]));
  assert.equal(result.paused, true);
  assert.equal(result.total, 0);
  assert.equal(created.length, 0);
});

test('added output-track clips block resume without overwriting their contents', () => {
  const { api, created } = host();
  const r = JSON.parse(api.beginGeneration({ ...options, sequenceId: 'original', projectPath: 'test.prproj' }));
  const userClip = { name: 'Manual graphic', start: { seconds: 0 }, end: { seconds: 1 } };
  created.push(userClip);
  const result = JSON.parse(api.insertBatch(r.sequenceId, [{ text: 'Hello', phraseIndex: 0, startFrame: 0, endFrame: 30 }]));
  assert.equal(result.paused, true);
  assert.deepEqual(created, [userClip]);
});

test('updates all prefix graphics in the selected phrase without changing timing', () => {
  const { api, project, created } = host();
  const result = JSON.parse(api.beginGeneration({ ...options, sequenceId: 'original', projectPath: 'test.prproj' }));
  api.insertBatch(result.sequenceId, [{ text: 'Hello', phraseIndex: 0, startFrame: 0, endFrame: 15 }, { text: 'Hello world', phraseIndex: 0, startFrame: 15, endFrame: 30 }]);
  project.activeSequence.selection = [created[0]];
  const phrase = JSON.parse(api.readPhrase());
  assert.equal(phrase.text, 'Hello world');
  assert.equal(JSON.parse(api.updatePhrase({ ...phrase, text: 'Hi everyone' })).ok, true);
  assert.deepEqual(created.map(c => JSON.parse(c.controls.Text.getValue()).textEditValue), ['Hi', 'Hi everyone']);
  assert.deepEqual(created.map(c => [c.start.seconds, c.end.seconds]), [[0, .5], [.5, 1]]);
  assert.equal(JSON.parse(api.updatePhrase({ ...phrase, text: 'too many new words' })).ok, false);
  assert.equal(JSON.parse(created[1].controls.Text.getValue()).textEditValue, 'Hi everyone');
  created[1].start.seconds = .1;
  assert.equal(JSON.parse(api.readPhrase()).ok, false);
  assert.equal(JSON.parse(api.updatePhrase({ ...phrase, text: 'Hello again' })).ok, false);
  assert.equal(JSON.parse(created[1].controls.Text.getValue()).textEditValue, 'Hi everyone');
});

test('copies source typography and controls only to selected graphics, preserving their words', () => {
  const { api, project, created } = host();
  const result = JSON.parse(api.beginGeneration({ ...options, sequenceId: 'original', projectPath: 'test.prproj' }));
  api.insertBatch(result.sequenceId, [0,1,2].map(i => ({ text: 'word' + i, phraseIndex: i, startFrame: i * 30, endFrame: (i+1) * 30 })));
  const data = JSON.parse(created[0].controls.Text.getValue());
  data.fontEditValue = ['Arial'];
  created[0].controls.Text.setValue(JSON.stringify(data));
  created[0].controls.Offset.value = [.1, .2];
  created[0].controls['Fill Color'].value = [1,10,20,30];
  project.activeSequence.selection = [created[0]];
  assert.equal(JSON.parse(api.captureStyle()).ok, true);
  project.activeSequence.selection = [created[1]];
  assert.equal(JSON.parse(api.applyStyle()).ok, true);
  assert.deepEqual(JSON.parse(created[1].controls.Text.getValue()).fontEditValue, ['Arial']);
  assert.equal(JSON.parse(created[1].controls.Text.getValue()).textEditValue, 'word1');
  assert.deepEqual(created[1].controls.Offset.value, [.1, .2]);
  assert.deepEqual(Array.from(created[1].controls['Fill Color'].value), [1,10,20,30]);
  assert.deepEqual(JSON.parse(created[2].controls.Text.getValue()).fontEditValue, ['Heebo']);
  project.activeSequence.selection = [created[1], created[2]];
  const different = JSON.parse(created[1].controls.Text.getValue());
  different.fontEditValue = ['Courier'];
  created[1].controls.Text.setValue(JSON.stringify(different));
  const before = created[1].controls.Text.getValue();
  created[2].controls.Size.isTimeVarying = () => true;
  assert.equal(JSON.parse(api.applyStyle()).ok, false);
  assert.equal(created[1].controls.Text.getValue(), before);
});

test('imports the template once and reuses independently editable instances across batches', () => {
  const { api, created, imported } = host();
  const r = JSON.parse(api.beginGeneration({ ...options, sequenceId: 'original', projectPath: 'test.prproj' }));
  for (let i = 0; i < 3; i++) assert.equal(JSON.parse(api.insertBatch(r.sequenceId, [{ text: 'word' + i, phraseIndex: 0, startFrame: i * 30, endFrame: (i+1)*30 }])).ok, true);
  assert.equal(imported.length, 1);
  assert.deepEqual(created.map(c => JSON.parse(c.controls.Text.getValue()).textEditValue), ['word0', 'word1', 'word2']);
});

test('parent follows playhead and sync rereads the latest style without changing destination words', () => {
  const { api, project, created } = host();
  const r = JSON.parse(api.beginGeneration({ ...options, sequenceId: 'original', projectPath: 'test.prproj' }));
  api.insertBatch(r.sequenceId, [0,1,2].map(i => ({ text: 'word' + i, phraseIndex: i, startFrame: i*30, endFrame: (i+1)*30 })));
  project.activeSequence.playhead = .5;
  assert.equal(JSON.parse(api.setParentFromPlayhead()).ok, true);
  const data = JSON.parse(created[0].controls.Text.getValue()); data.fontEditValue = ['Arial'];
  created[0].controls.Text.setValue(JSON.stringify(data));
  project.activeSequence.selection = [created[1]];
  assert.equal(JSON.parse(api.syncSelectedToParent()).ok, true);
  assert.deepEqual(JSON.parse(created[1].controls.Text.getValue()).fontEditValue, ['Arial']);
  assert.equal(JSON.parse(created[1].controls.Text.getValue()).textEditValue, 'word1');
  assert.deepEqual(JSON.parse(created[2].controls.Text.getValue()).fontEditValue, ['Heebo']);
  project.activeSequence.sequenceID = 'other';
  assert.equal(JSON.parse(api.syncSelectedToParent()).ok, false);
});

test('parent selection rejects gaps and ambiguous overlapping graphics', () => {
  const { api, project, created } = host();
  const r = JSON.parse(api.beginGeneration({ ...options, sequenceId: 'original', projectPath: 'test.prproj' }));
  api.insertBatch(r.sequenceId, [0,1].map(i => ({ text: 'word', phraseIndex: i, startFrame: i*30, endFrame: (i+1)*30 })));
  project.activeSequence.playhead = 4;
  assert.equal(JSON.parse(api.setParentFromPlayhead()).ok, false);
  project.activeSequence.playhead = .5; created[1].start.seconds = 0;
  assert.equal(JSON.parse(api.setParentFromPlayhead()).ok, false);
  project.activeSequence.selection = [created[1]];
  assert.equal(JSON.parse(api.setParentFromPlayhead()).ok, true);
  created.pop();
  assert.equal(JSON.parse(api.syncSelectedToParent()).ok, false);
});

test('preview appearance is applied consistently to each independently editable word graphic', () => {
  const { api, created } = host();
  const appearance = { font: 'ArialMT', size: 170, textColor: '#112233', highlightColor: '#abcdef', x: 25, y: 75, mode: 'reveal-highlight' };
  const r = JSON.parse(api.beginGeneration({ ...options, appearance, sequenceId: 'original', projectPath: 'test.prproj' }));
  assert.equal(r.ok, true);
  assert.equal(JSON.parse(api.insertBatch(r.sequenceId, [0,1].map(i => ({ text: 'word' + i, phraseIndex: 0, startFrame: i*30, endFrame: (i+1)*30 })))).ok, true);
  for (const clip of created) {
    assert.deepEqual(JSON.parse(clip.controls.Text.getValue()).fontEditValue, ['ArialMT']);
    assert.deepEqual(Array.from(clip.controls.Size.value), [200/1920,200/1080]);
    assert.deepEqual(Array.from(clip.controls.Offset.value), [-.25,.25]);
    assert.deepEqual(Array.from(clip.controls['Fill Color'].value), [1,17,34,51]);
    assert.deepEqual(Array.from(clip.controls['Active Word Color'].value), [1,171,205,239]);
  }
});

test('appearance is rejected before writes if values are invalid', () => {
  const { api, project } = host();
  assert.equal(JSON.parse(api.beginGeneration({ ...options, appearance: { font: 'Arial', size: 999 }, sequenceId: 'original', projectPath: 'test.prproj' })).ok, false);
  assert.equal(project.sequences.numSequences, 1);
});

test('phrase alignment writes the supported template anchor and bottom-center defaults', () => {
  const appearance = require('../prototype/cep/appearance');
  for (const alignment of ['left', 'center', 'right']) {
    const { api, created } = host();
    const r = JSON.parse(api.beginGeneration({ ...options, appearance: { ...appearance.defaults(), alignment }, sequenceId: 'original', projectPath: 'test.prproj' }));
    assert.equal(JSON.parse(api.insertBatch(r.sequenceId, [{ text: 'Example', phraseIndex: 0, startFrame: 0, endFrame: 30 }])).ok, true);
    assert.equal(created[0].controls['Anchor X'].getValue(), appearance.anchorX(alignment));
    assert.deepEqual(JSON.parse(created[0].controls.Text.getValue()).fontEditValue, ['TimesNewRomanPSMT']);
    assert.deepEqual(Array.from(created[0].controls.Offset.getValue()), [0, .4]);
    assert.deepEqual(Array.from(created[0].controls['Active Word Color'].getColorValue()), [1,235,235,235]);
  }
});

test('measured two-line layouts apply their reserved anchors and remain editable as phrases', () => {
  const appearance = require('../prototype/cep/appearance'), layout = require('../prototype/cep/layout');
  const { api, project, created } = host();
  const style = { ...appearance.defaults(), centeredReveal: true, alignment: 'left', lines: 2 };
  const r = JSON.parse(api.beginGeneration({ ...options, appearance: style, sequenceId: 'original', projectPath: 'test.prproj' }));
  const words = 'one two three four'.split(' ');
  const states = words.map((word, i) => {
    const placed = layout.state(words.join(' '), i + 1, style, text => text.length * 10);
    return { text: placed.text, layout: placed, phraseIndex: 0, startFrame: i * 30, endFrame: (i+1)*30 };
  });
  assert.equal(JSON.parse(api.insertBatch(r.sequenceId, states)).total, 4);
  assert(created.every(c => c.controls['Anchor Y'].getValue() === 0));
  assert(created.every(c => c.controls['Paragraph Alignment'].getValue() === 1));
  assert(created.every(c => !/[\r\n]/.test(c.name)));
  project.activeSequence.selection = [created[0]];
  const phrase = JSON.parse(api.readPhrase());
  assert.equal(phrase.text, 'one two\rthree four');
  assert.equal(JSON.parse(api.updatePhrase({ ...phrase, text: 'new words\nare here' })).ok, true);
  assert.equal(JSON.parse(created[3].controls.Text.getValue()).textEditValue, 'new words\rare here');
  assert.equal(JSON.parse(api.updatePhrase({ ...phrase, text: 'new\nwords\nare here' })).ok, false);
  assert.deepEqual(created.map(c => [c.start.seconds,c.end.seconds]), [[0,1],[1,2],[2,3],[3,4]]);
});

test('invalid or missing measured layouts are rejected before inserting a graphic', () => {
  const appearance = require('../prototype/cep/appearance');
  for (const layout of [undefined, { anchorX: 0, anchorY: 0, paragraph: 1, offset: [NaN, 0] }]) {
    const { api, created } = host();
    const r = JSON.parse(api.beginGeneration({ ...options, appearance: { ...appearance.defaults(), lines: 2 }, sequenceId: 'original', projectPath: 'test.prproj' }));
    assert.equal(JSON.parse(api.insertBatch(r.sequenceId, [{ text: 'one', layout, phraseIndex: 0, startFrame: 0, endFrame: 30 }])).ok, false);
    assert.equal(created.length, 0);
  }
});
