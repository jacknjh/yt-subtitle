async function activeContext(ppro) {
  const project = await ppro.Project.getActiveProject();
  if (!project) throw new Error('Open a project in Premiere first.');
  const sequence = await project.getActiveSequence();
  if (!sequence) throw new Error('Open a sequence in Premiere first.');
  return {
    project, sequence,
    projectId: project.guid.toString(), sequenceId: sequence.guid.toString(),
    projectName: project.name, sequenceName: sequence.name,
  };
}

async function assertCurrent(ppro, context) {
  const current = await activeContext(ppro);
  if (current.projectId !== context.projectId || current.sequenceId !== context.sequenceId) {
    throw new Error('The active project or sequence changed. Run the check again.');
  }
}

function identity(context) {
  return {
    projectId: context.projectId, sequenceId: context.sequenceId,
    projectName: context.projectName, sequenceName: context.sequenceName,
  };
}

async function readSequenceTranscript(ppro) {
  const context = await activeContext(ppro);
  if (typeof ppro.Transcript?.exportToJSON !== 'function') {
    throw new Error('This host does not expose Transcript.exportToJSON.');
  }
  const item = ppro.ClipProjectItem.cast(await context.sequence.getProjectItem());
  if (!item) throw new Error('The active sequence cannot be used as a transcript project item.');
  // A source-clip fallback could silently return different words and timing.
  const json = await ppro.Transcript.exportToJSON(item);
  let data;
  try { data = JSON.parse(json); } catch {
    throw new Error('Premiere did not return transcript JSON. Generate a transcript for this sequence first.');
  }
  if (!Array.isArray(data?.segments) || !data.segments.length ||
      data.segments.some(segment => !Array.isArray(segment?.words))) {
    throw new Error('The exported transcript has no segments or uses an unexpected word schema.');
  }
  const wordCount = data.segments.reduce((count, segment) => count + segment.words.length, 0);
  if (!wordCount) throw new Error('The exported transcript has no words.');
  await assertCurrent(ppro, context);
  return { ...identity(context), json, wordCount, timingVerified: false };
}

async function inspectSelectedGraphic(ppro) {
  const context = await activeContext(ppro);
  const selection = await context.sequence.getSelection();
  const items = await selection.getTrackItems();
  if (items.length !== 1) throw new Error('Select exactly one text graphic or MOGRT on the timeline.');
  const item = items[0];
  if (typeof item.getComponentChain !== 'function') {
    throw new Error('The selected item does not expose video components. Select a text graphic.');
  }
  const chain = await item.getComponentChain();
  const components = [];
  for (let index = 0; index < chain.getComponentCount(); index++) {
    const component = chain.getComponentAtIndex(index);
    const parameters = [];
    for (let paramIndex = 0; paramIndex < component.getParamCount(); paramIndex++) {
      const param = component.getParam(paramIndex);
      const entry = { index: paramIndex, name: param.displayName };
      try {
        const result = await param.getStartValue();
        entry.readStatus = result == null ? 'empty' : 'returned-value';
        const value = result && typeof result === 'object' && 'value' in result ? result.value : result;
        entry.valueType = value === null ? 'null' : typeof value;
        entry.hasTextAccessor = typeof result?.getText === 'function';
        entry.hasSetAction = typeof param.createSetValueAction === 'function';
      } catch (error) {
        entry.readStatus = 'error';
        entry.error = String(error.message || error);
      }
      parameters.push(entry);
    }
    components.push({ index, matchName: await component.getMatchName(), parameters });
  }
  const itemName = await item.getName();
  await assertCurrent(ppro, context);
  return {
    ...identity(context), itemName, components,
    writeVerified: false,
    note: 'Returned values and action availability do not establish successful text or style editing.',
  };
}

module.exports = { activeContext, readSequenceTranscript, inspectSelectedGraphic };
