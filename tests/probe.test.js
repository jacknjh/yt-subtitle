const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readSequenceTranscript, inspectSelectedGraphic } = require('../prototype/probe.js');

function host() {
  const sequenceItem = { name: 'Sequence item' };
  const transcript = JSON.stringify({ segments: [{ words: [{ text: 'Hello', start: 1, duration: 0.5 }] }] });
  const sequence = {
    guid: 'sequence-a', name: 'Sequence A',
    getProjectItem: async () => sequenceItem,
    getSelection: async () => ({ getTrackItems: async () => [] }),
  };
  const project = { guid: 'project-a', name: 'Project A', getActiveSequence: async () => sequence };
  const ppro = {
    Project: { getActiveProject: async () => project },
    ClipProjectItem: { cast: item => item },
    Transcript: { exportToJSON: async item => {
      assert.equal(item, sequenceItem, 'must export the active sequence, not an arbitrary source clip');
      return transcript;
    } },
  };
  return { ppro, project, sequence, transcript };
}

test('exports the active sequence transcript verbatim with explicit timing verification status', async () => {
  const { ppro, transcript } = host();
  const result = await readSequenceTranscript(ppro);
  assert.equal(result.json, transcript);
  assert.equal(result.sequenceId, 'sequence-a');
  assert.equal(result.wordCount, 1);
  assert.equal(result.timingVerified, false);
});

test('does not substitute a source transcript when sequence export fails', async () => {
  const { ppro } = host();
  ppro.Transcript.exportToJSON = async () => { throw new Error('No sequence transcript'); };
  await assert.rejects(readSequenceTranscript(ppro), /No sequence transcript/);
});

test('rejects an empty or unexpected transcript instead of reporting export success', async () => {
  for (const json of ['', '{}', '{', '{"segments":[]}', '{"segments":[{"words":null}]}']) {
    const { ppro } = host();
    ppro.Transcript.exportToJSON = async () => json;
    await assert.rejects(readSequenceTranscript(ppro));
  }
});

test('requires an open project and sequence', async () => {
  const { ppro, project } = host();
  project.getActiveSequence = async () => null;
  await assert.rejects(readSequenceTranscript(ppro), /Open a sequence/);
  ppro.Project.getActiveProject = async () => null;
  await assert.rejects(readSequenceTranscript(ppro), /Open a project/);
});

test('discards a transcript if the active sequence changes while it is read', async () => {
  const { ppro, project, sequence, transcript } = host();
  ppro.Transcript.exportToJSON = async () => {
    project.getActiveSequence = async () => ({ ...sequence, guid: 'sequence-b' });
    return transcript;
  };
  await assert.rejects(readSequenceTranscript(ppro), /sequence changed/i);
});

test('requires exactly one selected graphic for an unambiguous inspection', async () => {
  const { ppro, sequence } = host();
  await assert.rejects(inspectSelectedGraphic(ppro), /Select exactly one/);
  sequence.getSelection = async () => ({ getTrackItems: async () => [{}, {}] });
  await assert.rejects(inspectSelectedGraphic(ppro), /Select exactly one/);
});

test('records unreadable text independently from readable controls without claiming write support', async () => {
  const { ppro, sequence } = host();
  const params = [
    { displayName: 'Source Text', getStartValue: async () => undefined },
    { displayName: 'Unavailable', getStartValue: async () => { throw new Error('Unsupported'); } },
    { displayName: 'Active word', getStartValue: async () => ({ value: 2 }), createSetValueAction() {
      assert.fail('the diagnostic must never write to the timeline');
    } },
  ];
  const component = {
    getMatchName: async () => 'AE.ADBE Capsule',
    getParamCount: () => params.length, getParam: index => params[index],
  };
  sequence.getSelection = async () => ({ getTrackItems: async () => [{
    getName: async () => 'Test graphic',
    getComponentChain: async () => ({ getComponentCount: () => 1, getComponentAtIndex: () => component }),
  }] });
  const result = await inspectSelectedGraphic(ppro);
  const values = result.components[0].parameters;
  assert.equal(values[0].readStatus, 'empty');
  assert.equal(values[1].readStatus, 'error');
  assert.equal(values[2].readStatus, 'returned-value');
  assert.equal(values[2].valueType, 'number');
  assert.equal(result.writeVerified, false);
});

test('checks sequence identity after the final asynchronous graphic read', async () => {
  const { ppro, project, sequence } = host();
  sequence.getSelection = async () => ({ getTrackItems: async () => [{
    getComponentChain: async () => ({ getComponentCount: () => 0 }),
    getName: async () => {
      project.getActiveSequence = async () => ({ ...sequence, guid: 'sequence-b' });
      return 'Old sequence graphic';
    },
  }] });
  await assert.rejects(inspectSelectedGraphic(ppro), /sequence changed/i);
});
