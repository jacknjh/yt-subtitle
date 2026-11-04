(function (root, factory) {
  if (typeof module !== 'undefined') module.exports = factory(require('../identity.js'));
  else root.createTranscriptSessions = factory(root.SubtitleIdentity);
}(this, function (identity) {
  return function createTranscriptSessions(adapter) {
    let current = null, snapshot = null, ready = false, epoch = 0, readEpoch = 0;
    async function save() {
      if (!ready || !current) return false;
      let settings;
      try { settings = adapter.settings(); } catch { return false; }
      const record = { schema: 1, context: { ...current }, settings, json: snapshot ? snapshot.json : null, source: snapshot ? snapshot.source : 'premiere', capturedAt: snapshot ? snapshot.capturedAt : 0 };
      try { await adapter.save(record); return true; }
      catch (error) { adapter.error(error, { cacheOnly: true }); return false; }
    }
    async function refresh() {
      if (!current || !ready) return false;
      const myEpoch = epoch, myRead = ++readEpoch, context = { ...current };
      adapter.reading(true);
      try {
        const result = await adapter.read(context);
        if (epoch !== myEpoch || readEpoch !== myRead) return false;
        if (!identity.same(result.context, context) || typeof result.json !== 'string') throw new Error('Discarded a transcript for a different project or sequence.');
        const next = { json: result.json, source: 'premiere', capturedAt: result.capturedAt || Date.now() };
        adapter.transcript(next, context, { fresh: true, cached: false });
        snapshot = next;
        await save();
        return true;
      } catch (error) {
        if (epoch === myEpoch && readEpoch === myRead) adapter.error(error, { cacheOnly: false });
        return false;
      } finally { if (epoch === myEpoch && readEpoch === myRead) adapter.reading(false); }
    }
    async function activate(context, options = {}) {
      if (identity.same(current, context)) return false;
      const mine = ++epoch; ++readEpoch;
      await save();
      if (mine !== epoch) return false;
      current = { ...context }; snapshot = null; ready = false;
      adapter.reading(false); adapter.context(current); adapter.defaults();
      try {
        const cached = await adapter.restore(context);
        if (mine !== epoch) return false;
        if (cached && cached.schema === 1 && identity.same(cached.context, context)) {
          adapter.apply(cached.settings);
          if (typeof cached.json === 'string' && (cached.source === 'premiere' || cached.source === 'manual')) {
            adapter.transcript(cached, context, { fresh: cached.source === 'manual', cached: true });
            snapshot = { json: cached.json, source: cached.source, capturedAt: cached.capturedAt };
          }
        }
      } catch (error) { if (mine === epoch) adapter.error(error, { cacheOnly: true }); }
      if (mine !== epoch) return false;
      ready = true;
      if (options.refresh !== false && (!snapshot || snapshot.source !== 'manual')) return refresh();
      return true;
    }
    async function manual(json, context) {
      await activate(context, { refresh: false });
      if (!identity.same(current, context)) return false;
      ++epoch; ++readEpoch; adapter.reading(false);
      const next = { json, source: 'manual', capturedAt: Date.now() };
      adapter.transcript(next, context, { fresh: true, cached: false });
      snapshot = next; ready = true; await save(); return true;
    }
    async function clear() {
      const mine = ++epoch; ++readEpoch;
      await save();
      if (mine !== epoch) return;
      current = null; snapshot = null; ready = false; adapter.reading(false); adapter.context(null);
    }
    function cancelRead() { ++readEpoch; adapter.reading(false); }
    return { activate, refresh, manual, save, clear, cancelRead, context: () => current };
  };
}));
