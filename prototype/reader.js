const { same: sameIdentity } = require('./identity.js');

async function handleRequest(request, { session, context, read, now = Date.now }) {
  if (!request || request.protocol !== 1 || request.readerSession !== session || typeof request.id !== 'string' || !/^[a-z0-9-]{1,100}$/i.test(request.id) || !Number.isFinite(request.createdAt) || Math.abs(now() - request.createdAt) > 15000) return null;
  const response = { protocol: 1, id: request.id, readerSession: session, ok: false };
  try {
    if (request.type !== 'readTranscript' || !sameIdentity(await context(), request.context)) throw new Error('The active project or sequence changed. Refresh its transcript again.');
    const result = await read();
    if (!sameIdentity(result, request.context) || !sameIdentity(await context(), request.context)) throw new Error('The active project or sequence changed while reading the transcript.');
    return { ...response, ok: true, context: request.context, json: result.json, wordCount: result.wordCount, capturedAt: now() };
  } catch (error) { return { ...response, error: String(error.message || error) }; }
}

async function startReader({ fs, context, read, onStatus = () => {}, now = Date.now, schedule = setTimeout, unschedule = clearTimeout }) {
  const folder = await fs.getDataFolder();
  const session = now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const requestFile = await folder.createFile('request.json', { overwrite: true });
  const responseFile = await folder.createFile('response.json', { overwrite: true });
  const heartbeatFile = await folder.createFile('reader.json', { overwrite: true });
  await requestFile.write('{}'); await responseFile.write('{}');
  let running = true, timer, lastRequest = '', lastHeartbeat = 0;
  async function tick() {
    try {
      if (now() - lastHeartbeat >= 2000) {
        await heartbeatFile.write(JSON.stringify({ protocol: 1, readerSession: session, updatedAt: now() }));
        lastHeartbeat = now();
      }
      let request;
      try { request = JSON.parse(await requestFile.read()); } catch { request = null; }
      if (request && request.id && request.id !== lastRequest) {
        const result = await handleRequest(request, { session, context, read, now });
        lastRequest = request.id;
        if (result && running) await responseFile.write(JSON.stringify(result));
      }
      onStatus('Background transcript reader connected.');
    } catch (error) { onStatus('Reader error: ' + String(error.message || error)); }
    if (running) timer = schedule(tick, 250);
  }
  await tick();
  return { stop() { running = false; unschedule(timer); }, nativePath: folder.nativePath };
}

module.exports = { sameIdentity, handleRequest, startReader };
