const element = id => document.getElementById(id);
let loaded = null;
let busy = false;
let generating = false;
let cancelled = false;
let phraseSnapshot = null;

function host(expression) {
  return new Promise((resolve, reject) => window.__adobe_cep__.evalScript(expression, raw => {
    try {
      const result = JSON.parse(raw);
      if (!result.ok) throw new Error(result.error || 'Premiere operation failed.');
      resolve(result);
    } catch (error) { reject(error); }
  }));
}

function argument(value) { return JSON.stringify(value).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }

function controls() {
  ['load', 'characters', 'single-word', 'capture-style', 'apply-style', 'read-phrase', 'phrase-text'].forEach(id => { element(id).disabled = busy; });
  element('generate').disabled = busy || !loaded;
  element('cancel').disabled = !generating;
  element('update-phrase').disabled = busy || !phraseSnapshot;
}

function preview() {
  if (!loaded) return null;
  const plan = planTranscript(loaded.data, Number(element('characters').value), element('single-word').checked, loaded.context.fps);
  element('summary').textContent = loaded.context.sequenceName + ': ' + plan.wordCount + ' words, ' + plan.phrases.length + ' phrases.';
  element('preview').textContent = plan.phrases.slice(0, 5).join('\n');
  return plan;
}

// Also used by the development transcript reader; file loading binds to the active sequence.
function acceptTranscript(json, context) {
  loaded = null;
  controls();
  const data = JSON.parse(json.replace(/^\uFEFF/, ''));
  planTranscript(data, Number(element('characters').value), element('single-word').checked, context.fps);
  loaded = { data, context };
  preview();
  controls();
  element('status').textContent = 'Transcript ready. Generation duplicates this sequence and adds editable word graphics to its empty top video track.';
}

element('load').addEventListener('click', async () => {
  busy = true; controls();
  try {
    const result = await host('YTSubtitle.loadTranscript()');
    if (!result.cancelled) acceptTranscript(result.json, result.context);
  } catch (error) { element('status').textContent = error.message; }
  finally { busy = false; controls(); }
});

['characters', 'single-word'].forEach(id => element(id).addEventListener('change', () => {
  try { preview(); element('status').textContent = 'Phrase grouping updated.'; }
  catch (error) { element('status').textContent = error.message; }
}));

element('cancel').addEventListener('click', () => { cancelled = true; element('status').textContent = 'Stopping after the current batch…'; });

element('generate').addEventListener('click', async () => {
  if (busy || !loaded) return;
  let created = null;
  let inserted = 0;
  try {
    const plan = preview();
    if (!window.proofConfig) throw new Error('The local subtitle template has not been configured.');
    busy = true; generating = true; cancelled = false; controls();
    created = await host('YTSubtitle.beginGeneration(' + argument({ ...window.proofConfig, ...loaded.context }) + ')');
    for (let index = 0; index < plan.clips.length && !cancelled; index += 5) {
      element('status').textContent = 'Creating editable graphics: ' + inserted + ' / ' + plan.clips.length + '. You can stop after this batch.';
      const batch = await host('YTSubtitle.insertBatch(' + argument(created.sequenceId) + ',' + argument(plan.clips.slice(index, index + 5)) + ')');
      inserted = batch.total;
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    element('status').textContent = (cancelled ? 'Stopped. ' : 'Done. ') + inserted + ' editable graphics in “' + created.sequenceName + '”. The source sequence is unchanged.';
  } catch (error) {
    element('status').textContent = error.message + (created ? ' Partial graphics remain in “' + created.sequenceName + '”. The source sequence is unchanged.' : '');
  } finally { busy = false; generating = false; controls(); }
});

async function editSelected(expression, completed) {
  if (busy) return;
  busy = true; controls();
  try {
    const result = await host(expression);
    if (completed) completed(result);
    element('status').textContent = result.note || 'Phrase loaded. Correct its text below, then update.';
  } catch (error) { element('status').textContent = error.message; }
  finally { busy = false; controls(); }
}

element('capture-style').addEventListener('click', () => editSelected('YTSubtitle.captureStyle()'));
element('apply-style').addEventListener('click', () => editSelected('YTSubtitle.applyStyle()'));
element('read-phrase').addEventListener('click', () => {
  phraseSnapshot = null;
  return editSelected('YTSubtitle.readPhrase()', result => { phraseSnapshot = result; element('phrase-text').value = result.text; });
});
element('update-phrase').addEventListener('click', () => {
  if (!phraseSnapshot) return;
  return editSelected('YTSubtitle.updatePhrase(' + argument({ ...phraseSnapshot, text: element('phrase-text').value }) + ')');
});

controls();
