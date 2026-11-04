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
const appearanceIds = ['font', 'font-size', 'text-color', 'highlight-color', 'position-x', 'position-y', 'animation'];
const tabIds = ['generate', 'style', 'edit', 'help'];
let activeTab = 'generate';
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
  if (name !== 'style') stopPreview();
  tabIds.forEach(id => {
    const active = id === name;
    element('tab-' + id).setAttribute('aria-selected', String(active));
    element('tab-' + id).tabIndex = active ? 0 : -1;
    element('panel-' + id).hidden = !active;
  });
  activeTab = name;
  content.scrollTop = tabScroll[name] || 0;
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
  ['load', 'characters', 'single-word', 'capture-style', 'read-phrase', 'phrase-text', 'preview-play', 'preview-time', 'preview-phrase', 'font-search', 'text-color-hex', 'highlight-color-hex'].concat(appearanceIds).forEach(id => { element(id).disabled = busy; });
  element('apply-style').disabled = busy || !parentReady;
  element('generate').disabled = busy || !loaded;
  element('cancel').disabled = !generating;
  element('update-phrase').disabled = busy || !phraseSnapshot;
}

function preview() {
  stopPreview();
  const sample = { segments: [{ words: ['Preview', 'your', 'subtitles.'].map((text, i) => ({ text, start: i * .5, duration: .5 })) }] };
  const plan = planTranscript(loaded ? loaded.data : sample, Number(element('characters').value), element('single-word').checked, loaded ? loaded.context.fps : 30);
  if (loaded) element('summary').textContent = loaded.context.sequenceName + ': ' + plan.wordCount + ' words, ' + plan.phrases.length + ' phrases.';
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
function acceptTranscript(json, context) {
  loaded = null;
  controls();
  const data = JSON.parse(json.replace(/^\uFEFF/, ''));
  planTranscript(data, Number(element('characters').value), element('single-word').checked, context.fps);
  loaded = { data, context };
  element('preview-phrase').value = '';
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
    const settings = appearance();
    if (!window.proofConfig) throw new Error('The local subtitle template has not been configured.');
    busy = true; generating = true; cancelled = false; controls();
    const started = Date.now();
    element('generation-progress').hidden = false;
    element('generation-progress').max = plan.clips.length;
    element('generation-progress').value = 0;
    element('progress-label').textContent = 'Preparing one template for reuse…';
    created = await host('YTSubtitle.beginGeneration(' + argument({ ...window.proofConfig, ...loaded.context, appearance: settings }) + ')');
    for (let index = 0; index < plan.clips.length && !cancelled; index += 5) {
      element('status').textContent = 'Creating editable graphics: ' + inserted + ' / ' + plan.clips.length + '. You can stop after this batch.';
      const batch = await host('YTSubtitle.insertBatch(' + argument(created.sequenceId) + ',' + argument(plan.clips.slice(index, index + 5)) + ')');
      inserted = batch.total;
      element('generation-progress').value = inserted;
      element('progress-label').textContent = inserted + ' / ' + plan.clips.length + ' graphics, ' + ((Date.now() - started) / 1000).toFixed(1) + ' seconds elapsed';
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

function updateAppearance() {
  try { appearance(); drawPreview(); element('status').textContent = 'Appearance updated for newly generated graphics.'; }
  catch (error) { stopPreview(); element('status').textContent = error.message; }
}
appearanceIds.filter(id => id !== 'text-color' && id !== 'highlight-color').forEach(id => {
  element(id).addEventListener('input', updateAppearance);
  element(id).addEventListener('change', updateAppearance);
});
['text-color', 'highlight-color'].forEach(id => {
  const picker = element(id), hex = element(id + '-hex');
  function fromPicker() { hex.value = picker.value; hex.setAttribute('aria-invalid', 'false'); updateAppearance(); }
  function fromHex() {
    const valid = /^#[0-9a-f]{6}$/i.test(hex.value.trim());
    hex.setAttribute('aria-invalid', String(!valid));
    if (valid) picker.value = hex.value.trim().toLowerCase();
    updateAppearance();
  }
  picker.addEventListener('input', fromPicker); picker.addEventListener('change', fromPicker);
  hex.addEventListener('input', fromHex); hex.addEventListener('change', fromHex);
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
preview();
showTab('generate');
controls();
