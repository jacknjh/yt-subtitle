const element = id => document.getElementById(id);
let loaded = null;
let busy = false;
let generating = false;
let cancelled = false;
let phraseSnapshot = null;
let parentReady = false;
let renderedPlan = null;
let previewClips = [];
let previewPlaying = false;
let previewRequest = 0;
let previewStarted = 0;
let transcriptFresh = false;
let transcriptReading = false;
let manualChoosing = false;
let transcriptError = '';
let settingsTimer;
let pendingRun = null;
let settingsHistory = null;
const settingHistories = new Map();
const appearanceIds = ['font', 'font-size', 'text-color', 'highlight-color', 'position-x', 'position-y', 'animation'];
const tabIds = ['generate', 'style', 'edit', 'help'];
let activeTab = 'generate';
let styleScroll = 0;
const tabScroll = {};
const standardFonts = [
  { postscript: 'Heebo-SemiBold', label: 'Heebo SemiBold', family: 'Heebo', style: 'SemiBold' },
  { postscript: 'ArialMT', label: 'Arial', family: 'Arial', style: 'Regular' },
  { postscript: 'Arial-BoldMT', label: 'Arial Bold', family: 'Arial', style: 'Bold' },
  { postscript: 'TimesNewRomanPSMT', label: 'Times New Roman', family: 'Times New Roman', style: 'Regular' },
];
const fontCatalog = Array.from(new Map(standardFonts.concat(window.SubtitleFonts || []).filter(font => typeof font.postscript === 'string' && typeof font.label === 'string').map(font => [font.postscript, font])).values()).sort((a, b) => a.label.localeCompare(b.label));

function showTab(name, focus = false) {
  const content = element('tab-content');
  tabScroll[activeTab] = content.scrollTop || 0;
  if (activeTab === 'style') styleScroll = element('style-settings').scrollTop || 0;
  if (name !== 'style') stopPreview();
  tabIds.forEach(id => {
    const active = id === name;
    element('tab-' + id).setAttribute('aria-selected', String(active));
    element('tab-' + id).tabIndex = active ? 0 : -1;
    element('panel-' + id).hidden = !active;
  });
  activeTab = name;
  content.setAttribute('data-tab', name);
  content.scrollTop = tabScroll[name] || 0;
  if (name === 'style') element('style-settings').scrollTop = styleScroll;
  if (focus) element('tab-' + name).focus();
}

function renderFonts() {
  const select = element('font'), selected = select.value || 'Heebo-SemiBold';
  const query = element('font-search').value.trim().toLocaleLowerCase();
  const matches = fontCatalog.filter(font => [font.label, font.family, font.style, font.postscript].join(' ').toLocaleLowerCase().includes(query));
  const current = fontCatalog.find(font => font.postscript === selected) || { postscript: selected, label: selected };
  const choices = matches.some(font => font.postscript === selected) ? matches : [current].concat(matches);
  select.innerHTML = '';
  choices.forEach(font => { const option = document.createElement('option'); option.value = font.postscript; option.textContent = font.label; select.appendChild(option); });
  select.value = selected;
  element('font-status').textContent = query ? matches.length + ' matching font faces. Current selection is retained.' : fontCatalog.length + ' font faces available.';
}

function appearance() {
  return SubtitleAppearance.validate({ font: element('font').value.trim(), size: Number(element('font-size').value), textColor: element('text-color-hex').value.trim(), highlightColor: element('highlight-color-hex').value.trim(), x: Number(element('position-x').value), y: Number(element('position-y').value), mode: element('animation').value });
}

function host(expression) {
  const root = window.__adobe_cep__.getSystemPath('extension');
  const bootstrap = 'if(typeof YTSubtitle==="undefined"||YTSubtitle.apiVersion!==3){$.evalFile(new File(' + argument(root + '/host.jsx') + '));}YTSubtitle.initialize(' + argument(root) + ');';
  return new Promise((resolve, reject) => window.__adobe_cep__.evalScript(bootstrap + expression, raw => {
    try {
      if (raw === 'EvalScript error.') throw new Error('Subtitle Generator could not connect to Premiere. Close and reopen this panel, then try again.');
      const result = JSON.parse(raw);
      if (!result.ok) throw new Error(result.error || 'Premiere operation failed.');
      resolve(result);
    } catch (error) { reject(error); }
  }));
}

function argument(value) { return JSON.stringify(value).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }

function controls() {
  ['load', 'characters', 'single-word', 'capture-style', 'read-phrase', 'phrase-text', 'preview-play', 'preview-time', 'preview-phrase', 'font-search', 'text-color-hex', 'highlight-color-hex'].concat(appearanceIds).forEach(id => { element(id).disabled = busy; });
  element('apply-style').disabled = busy || !parentReady;
  element('generate').disabled = busy || !!pendingRun || transcriptReading || !loaded || !transcriptFresh;
  ['resume', 'discard-run'].forEach(id => { element(id).hidden = !pendingRun; element(id).disabled = busy || !pendingRun; });
  element('refresh-transcript').disabled = busy || transcriptReading;
  element('cancel').disabled = !generating;
  element('update-phrase').disabled = busy || !phraseSnapshot;
  ['characters', 'single-word', 'font-search', 'text-color-hex', 'highlight-color-hex'].concat(appearanceIds).forEach(id => { element(id).disabled = busy || !settingsHistory; });
  element('undo-settings').disabled = busy || !settingsHistory || !settingsHistory.canUndo();
  element('redo-settings').disabled = busy || !settingsHistory || !settingsHistory.canRedo();
}

function preview() {
  stopPreview();
  const sample = { segments: [{ words: ['Preview', 'your', 'subtitles.'].map((text, i) => ({ text, start: i * .5, duration: .5 })) }] };
  const plan = planTranscript(loaded ? loaded.data : sample, Number(element('characters').value), element('single-word').checked, loaded ? loaded.context.fps : 30);
  if (loaded) element('summary').textContent = plan.wordCount + ' words · ' + plan.phrases.length + ' phrases';
  element('preview').textContent = plan.phrases.slice(0, 5).join('\n');
  renderedPlan = plan;
  const select = element('preview-phrase');
  let selected = Number(select.value);
  if (select.value === '' || selected >= plan.phrases.length) selected = Math.max(0, plan.phrases.findIndex(text => text.includes(' ')));
  select.innerHTML = '';
  plan.phrases.forEach((text, index) => {
    const option = document.createElement('option'); option.value = String(index); option.textContent = text; select.appendChild(option);
  });
  select.value = String(selected);
  choosePreviewPhrase();
  return plan;
}

function stopPreview() {
  previewPlaying = false;
  if (previewRequest) window.cancelAnimationFrame(previewRequest);
  element('preview-play').textContent = 'Play preview';
  element('preview-play').setAttribute('aria-pressed', 'false');
}

function choosePreviewPhrase() {
  stopPreview();
  previewClips = renderedPlan.clips.filter(clip => clip.phraseIndex === Number(element('preview-phrase').value));
  element('preview-time').max = Math.max(1, previewClips[previewClips.length - 1].endFrame - previewClips[0].startFrame);
  element('preview-time').value = '0';
  drawPreview();
}

function drawPreview() {
  const canvas = element('subtitle-preview');
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx || !previewClips.length) return;
  const style = appearance();
  ctx.setTransform(canvas.width / 1920, 0, 0, canvas.height / 1080, 0, 0);
  ctx.fillStyle = '#151515'; ctx.fillRect(0, 0, 1920, 1080);
  const caption = SubtitleAppearance.captionAt(previewClips, previewClips[0].startFrame + Number(element('preview-time').value));
  if (!caption) return;
  const font = fontCatalog.find(face => face.postscript === style.font) || { family: style.font, style: 'Regular' };
  const face = font.style || 'Regular';
  const weight = /black|heavy/i.test(face) ? 900 : /extra.?bold/i.test(face) ? 800 : /semi.?bold|demi/i.test(face) ? 600 : /bold/i.test(face) ? 700 : /medium/i.test(face) ? 500 : /light/i.test(face) ? 300 : 400;
  ctx.font = (/italic|oblique/i.test(face) ? 'italic ' : '') + weight + ' ' + style.size + 'px "' + (font.family || style.font).replace(/["\\]/g, '') + '", sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const x = style.x * 19.2, y = style.y * 10.8, text = SubtitleAppearance.splitHighlight(caption.text);
  ctx.fillStyle = style.textColor; ctx.fillText(text.prefix, x, y);
  ctx.fillStyle = style.mode === 'reveal-highlight' ? style.highlightColor : style.textColor;
  ctx.fillText(text.word, x + ctx.measureText(text.prefix).width, y);
}

function animatePreview() {
  if (!previewPlaying) return;
  const fps = loaded ? loaded.context.fps : 30;
  element('preview-time').value = String(Math.floor((Date.now() - previewStarted) * fps / 1000) % (Number(element('preview-time').max) + 1));
  drawPreview();
  previewRequest = window.requestAnimationFrame(animatePreview);
}

// Also used by the development transcript reader; file loading binds to the active sequence.
function acceptTranscript(json, context, options = {}) {
  loaded = null;
  controls();
  const data = JSON.parse(json.replace(/^\uFEFF/, ''));
  planTranscript(data, Number(element('characters').value), element('single-word').checked, context.fps);
  loaded = { data, context, source: options.source || 'manual' };
  transcriptFresh = options.fresh !== false;
  element('preview-phrase').value = '';
  preview();
  controls();
  element('status').textContent = 'Transcript ready. Generation adds editable word graphics to this sequence’s empty top video track.';
}

element('load').addEventListener('click', async () => {
  busy = true; manualChoosing = true; sessions.cancelRead(); controls();
  try {
    const result = await host('YTSubtitle.loadTranscript()');
    if (!result.cancelled) await sessions.manual(result.json, result.context);
    else element('status').textContent = 'No JSON file selected. Refresh from Premiere to read the current transcript, or choose an exported JSON file.';
  } catch (error) { element('status').textContent = error.message; }
  finally { busy = false; manualChoosing = false; controls(); }
});

['characters', 'single-word'].forEach(id => element(id).addEventListener('change', () => {
  try { preview(); recordSettings(id); finishSettingsEdit(); queueSettingsSave(); element('status').textContent = 'Phrase grouping updated.'; }
  catch (error) { element('status').textContent = error.message; }
}));

element('cancel').addEventListener('click', () => { cancelled = true; element('status').textContent = 'Pausing after the current batch…'; });

async function continueGeneration() {
  const run = pendingRun;
  if (!run) return;
  busy = true; generating = true; cancelled = false; controls();
  let note = '';
  try {
    while (run.inserted < run.clips.length && !cancelled) {
      element('status').textContent = 'Creating editable graphics in “' + run.sequenceName + '”: ' + run.inserted + ' / ' + run.clips.length + '. You can pause after this batch.';
      const end = Math.min(run.inserted + 5, run.clips.length);
      const batch = await host('YTSubtitle.insertBatch(' + argument(run.sequenceId) + ',' + argument(run.clips.slice(run.inserted, end)) + ')');
      if (!Number.isInteger(batch.total) || batch.total < run.inserted || batch.total > end || (!batch.paused && batch.total === run.inserted)) throw new Error('Premiere returned unexpected generation progress.');
      run.inserted = batch.total;
      element('generation-progress').value = run.inserted;
      element('progress-label').textContent = run.inserted + ' / ' + run.clips.length + ' graphics, ' + ((Date.now() - run.started) / 1000).toFixed(1) + ' seconds since starting';
      if (batch.paused) { note = batch.note || ''; break; }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (run.inserted === run.clips.length) {
      element('status').textContent = 'Done. ' + run.inserted + ' editable graphics in “' + run.sequenceName + '”.';
      pendingRun = null;
    } else {
      const message = 'Paused at ' + run.inserted + ' / ' + run.clips.length + ' in “' + run.sequenceName + '”. ' + (note || 'Return to this timeline and press Resume.');
      element('status').textContent = message; element('progress-label').textContent = message;
    }
  } catch (error) {
    pendingRun = null;
    element('status').textContent = error.message + ' Partial graphics remain in “' + run.sequenceName + '”. Check that track before starting again.';
  } finally { busy = false; generating = false; controls(); }
}

element('resume').addEventListener('click', () => { if (!busy) return continueGeneration(); });
element('discard-run').addEventListener('click', () => {
  if (busy || !pendingRun) return;
  pendingRun = null;
  element('status').textContent = 'Run discarded. Completed graphics remain on the timeline; remove them before generating again there.';
  element('progress-label').textContent = ''; controls();
});
element('generate').addEventListener('click', async () => {
  if (busy || pendingRun || !loaded) return;
  try {
    busy = true; controls();
    if (loaded.source === 'premiere' && !await sessions.refresh()) throw new Error(transcriptError || 'Could not refresh this timeline transcript.');
    const plan = preview();
    const settings = appearance();
    if (!window.proofConfig) throw new Error('The local subtitle template has not been configured.');
    const created = await host('YTSubtitle.beginGeneration(' + argument({ ...window.proofConfig, ...loaded.context, appearance: settings }) + ')');
    // shortcut: one resumable run in the open panel; persist native clip state before adding restart recovery.
    pendingRun = { ...created, clips: plan.clips, inserted: 0, started: Date.now() };
    element('generation-progress').hidden = false;
    element('generation-progress').max = plan.clips.length;
    element('generation-progress').value = 0;
    await continueGeneration();
  } catch (error) { element('status').textContent = error.message; }
  finally { busy = false; generating = false; controls(); }
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

element('capture-style').addEventListener('click', () => {
  parentReady = false;
  element('parent-status').textContent = 'Setting parent…';
  return editSelected('YTSubtitle.setParentFromPlayhead()', result => { parentReady = true; element('parent-status').textContent = 'Parent: ' + result.parentName; }).then(() => {
    if (!parentReady) element('parent-status').textContent = 'No parent set.';
  });
});
element('apply-style').addEventListener('click', () => editSelected('YTSubtitle.syncSelectedToParent()'));
element('read-phrase').addEventListener('click', () => {
  phraseSnapshot = null;
  return editSelected('YTSubtitle.readPhrase()', result => { phraseSnapshot = result; element('phrase-text').value = result.text; });
});
element('update-phrase').addEventListener('click', () => {
  if (!phraseSnapshot) return;
  return editSelected('YTSubtitle.updatePhrase(' + argument({ ...phraseSnapshot, text: element('phrase-text').value }) + ')');
});

function updateAppearance(group) {
  try { appearance(); drawPreview(); recordSettings(group); queueSettingsSave(); element('status').textContent = 'Appearance updated for newly generated graphics.'; }
  catch (error) { stopPreview(); element('status').textContent = error.message; }
}
['font-size', 'position-x', 'position-y'].forEach(id => attachSubtitleScrub(element(id), () => updateAppearance(id), finishSettingsEdit));
appearanceIds.filter(id => id !== 'text-color' && id !== 'highlight-color').forEach(id => {
  element(id).addEventListener('input', () => updateAppearance(id));
  element(id).addEventListener('change', () => { updateAppearance(id); finishSettingsEdit(); });
  element(id).addEventListener('blur', finishSettingsEdit);
});
['text-color', 'highlight-color'].forEach(id => {
  const picker = element(id), hex = element(id + '-hex');
  function fromPicker() { hex.value = picker.value; hex.setAttribute('aria-invalid', 'false'); updateAppearance(id); }
  function fromHex() {
    const valid = /^#[0-9a-f]{6}$/i.test(hex.value.trim());
    hex.setAttribute('aria-invalid', String(!valid));
    if (valid) picker.value = hex.value.trim().toLowerCase();
    updateAppearance(id + '-hex');
  }
  picker.addEventListener('input', fromPicker); picker.addEventListener('change', () => { fromPicker(); finishSettingsEdit(); });
  hex.addEventListener('input', fromHex); hex.addEventListener('change', () => { fromHex(); finishSettingsEdit(); });
  hex.addEventListener('blur', finishSettingsEdit);
});
tabIds.forEach((id, index) => {
  element('tab-' + id).addEventListener('click', () => showTab(id));
  element('tab-' + id).addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabIds.length;
    else if (event.key === 'ArrowLeft') next = (index + tabIds.length - 1) % tabIds.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabIds.length - 1;
    else return;
    event.preventDefault(); showTab(tabIds[next], true);
  });
});
element('font-search').addEventListener('input', renderFonts);
element('preview-phrase').addEventListener('change', choosePreviewPhrase);
element('preview-time').addEventListener('input', () => { stopPreview(); drawPreview(); });
element('preview-play').addEventListener('click', () => {
  if (previewPlaying) { stopPreview(); return; }
  previewPlaying = true;
  previewStarted = Date.now() - Number(element('preview-time').value) / (loaded ? loaded.context.fps : 30) * 1000;
  element('preview-play').textContent = 'Pause preview';
  element('preview-play').setAttribute('aria-pressed', 'true');
  animatePreview();
});
renderFonts();
function currentSettings() {
  const characters = Number(element('characters').value);
  if (!Number.isInteger(characters) || characters < 1 || characters > 200) throw new Error('Choose a valid phrase length.');
  return { appearance: appearance(), characters, singleWord: element('single-word').checked };
}
function applySettings(settings) {
  const style = SubtitleAppearance.validate(settings.appearance);
  if (!Number.isInteger(settings.characters) || settings.characters < 1 || settings.characters > 200 || typeof settings.singleWord !== 'boolean') throw new Error('Saved phrase settings were invalid.');
  if (!fontCatalog.some(font => font.postscript === style.font)) fontCatalog.push({ postscript: style.font, label: style.font, family: style.font, style: 'Regular' });
  element('font-search').value = ''; renderFonts();
  element('font').value = style.font; element('font-size').value = style.size;
  for (const [id, value] of [['text-color', style.textColor], ['highlight-color', style.highlightColor]]) { element(id).value = value; element(id + '-hex').value = value; element(id + '-hex').setAttribute('aria-invalid', 'false'); }
  element('position-x').value = style.x; element('position-y').value = style.y; element('animation').value = style.mode;
  element('characters').value = settings.characters; element('single-word').checked = settings.singleWord;
  preview();
}
function queueSettingsSave() { clearTimeout(settingsTimer); settingsTimer = setTimeout(() => { void sessions.save(); }, 500); }
function recordSettings(group) { if (settingsHistory) settingsHistory.record(currentSettings(), group); controls(); }
function finishSettingsEdit() { if (settingsHistory) settingsHistory.end(); controls(); }
function restoreSettingsHistory(direction) {
  if (busy || !settingsHistory) return;
  const settings = settingsHistory[direction]();
  if (!settings) return;
  applySettings(settings); queueSettingsSave(); controls();
  element('status').textContent = direction === 'undo' ? 'Undid panel settings.' : 'Redid panel settings.';
}
element('undo-settings').addEventListener('click', () => restoreSettingsHistory('undo'));
element('redo-settings').addEventListener('click', () => restoreSettingsHistory('redo'));
document.addEventListener('keydown', event => {
  if ((!event.ctrlKey && !event.metaKey) || event.altKey || event.isComposing) return;
  const key = event.key.toLowerCase();
  if (key !== 'z' && key !== 'y') return;
  const target = event.target || document.activeElement;
  if (target && (target.isContentEditable || target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && ['text', 'search', 'number'].includes(target.type)))) return;
  event.preventDefault();
  if (document.body && document.body.classList.contains('scrubbing')) return;
  restoreSettingsHistory(key === 'y' || event.shiftKey ? 'redo' : 'undo');
});
if (typeof window.__adobe_cep__.registerKeyEventsInterest === 'function') {
  window.__adobe_cep__.registerKeyEventsInterest(JSON.stringify([{ keyCode: 90, ctrlKey: true, shiftKey: false, altKey: false }, { keyCode: 90, ctrlKey: true, shiftKey: true, altKey: false }, { keyCode: 89, ctrlKey: true, shiftKey: false, altKey: false }]));
}
settingsHistory = createSettingsHistory(currentSettings());
const sessions = createTranscriptSessions({
  settings: currentSettings,
  defaults: () => applySettings({ appearance: SubtitleAppearance.defaults(), characters: 24, singleWord: false }),
  apply: applySettings,
  restore: async context => (await host('YTSubtitle.readSession(' + argument(context) + ')')).session,
  save: record => host('YTSubtitle.writeSession(' + argument(record) + ')'),
  ready(context) {
    const key = SubtitleIdentity.key(context), settings = currentSettings();
    let history = settingHistories.get(key);
    if (!history || JSON.stringify(history.value()) !== JSON.stringify(settings)) history = createSettingsHistory(settings);
    settingHistories.set(key, history); settingsHistory = history; controls();
  },
  context(context) {
    if (settingsHistory) settingsHistory.end();
    settingsHistory = context ? null : createSettingsHistory(currentSettings());
    loaded = null; transcriptFresh = false; parentReady = false; phraseSnapshot = null;
    element('parent-status').textContent = 'Set a parent in this timeline to sync its graphics.';
    element('sequence-label').textContent = context ? 'Timeline: ' + context.sequenceName : 'Open a project and timeline in Premiere.';
    element('sequence-label').title = context ? context.sequenceName : '';
    element('summary').textContent = context ? 'Reading this timeline’s transcript…' : 'No active timeline.';
    element('transcript-source').textContent = ''; controls();
  },
  reading(value) { transcriptReading = value; if (value) { transcriptError = ''; element('transcript-source').textContent = 'Reading current transcript from Premiere…'; } controls(); },
  async read(context) {
    if (manualChoosing) throw new Error('Manual JSON selection is in progress.');
    const ticket = await host('YTSubtitle.requestTranscript(' + argument(context) + ')');
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      if (manualChoosing) throw new Error('Manual JSON selection is in progress.');
      const result = await host('YTSubtitle.pollTranscript(' + argument(ticket.requestId) + ')');
      if (!result.pending) return result;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('The transcript reader did not reply. Refresh again, or choose a JSON file.');
  },
  transcript(record, context, flags) {
    acceptTranscript(record.json, context, { source: record.source, fresh: flags.fresh });
    const label = record.source === 'manual' ? 'Manual JSON snapshot' : flags.cached ? 'Cached Premiere transcript; refreshing…' : 'Current Premiere transcript';
    element('transcript-source').textContent = label + (record.capturedAt ? ' (' + new Date(record.capturedAt).toLocaleTimeString() + ')' : '');
    element('status').textContent = flags.fresh ? 'Transcript ready for this timeline. Settings are remembered automatically.' : 'Showing cached words while the current transcript is read.';
  },
  error(error, options) {
    if (manualChoosing) return;
    if (!options.cacheOnly) { transcriptError = error.message; if (!loaded || loaded.source !== 'manual') transcriptFresh = false; element('transcript-source').textContent = loaded ? 'Saved snapshot shown; current Premiere transcript unavailable.' : 'No current transcript loaded.'; }
    element('status').textContent = (options.cacheOnly ? 'Could not remember sequence settings: ' : '') + error.message;
    controls();
  },
});
element('refresh-transcript').addEventListener('click', async () => {
  try { const result = await host('YTSubtitle.getContext()'); await sessions.activate(result.context, { refresh: false }); await sessions.refresh(); }
  catch (error) { element('status').textContent = error.message; }
});
let checkingContext = false;
async function watchContext() {
  if (busy || checkingContext) return;
  checkingContext = true;
  try { const result = await host('YTSubtitle.getContext()'); element('sequence-label').textContent = 'Timeline: ' + result.context.sequenceName; await sessions.activate(result.context); }
  catch (error) { await sessions.clear(); element('status').textContent = error.message; }
  finally { checkingContext = false; }
}
preview();
showTab('generate');
controls();
if (typeof window.setInterval === 'function') { void watchContext(); window.setInterval(watchContext, 1000); }
