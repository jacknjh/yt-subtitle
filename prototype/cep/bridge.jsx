function createSubtitleBridge(getContext) {
    var pending = null;
    function read(file) {
        file.encoding = 'UTF-8';
        if (!file.open('r')) throw new Error('Could not read local transcript data.');
        var value;
        try { value = file.read(); } finally { file.close(); }
        return JSON.parse(value.replace(/^\uFEFF/, ''));
    }
    function write(file, value) {
        file.encoding = 'UTF-8';
        if (!file.open('w')) throw new Error('Could not save local transcript data.');
        try { if (!file.write(JSON.stringify(value))) throw new Error('Local transcript write failed.'); }
        finally { file.close(); }
    }
    function findReader() {
        var base = Folder.userData.fsName + '/Adobe/UXP/PluginsStorage/PPRO/' + app.version.split('.')[0];
        var newest = null;
        // shortcut: Adobe's Windows UXP storage layout; add another locator if the host changes it.
        var modes = ['External', 'Developer'];
        for (var m = 0; m < modes.length; m++) {
            var mode = new Folder(base + '/' + modes[m]);
            if (!mode.exists) continue;
            var entries = mode.getFiles('local.ytsubtitle.reader*');
            for (var i = 0; i < entries.length; i++) {
                if (!(entries[i] instanceof Folder) || !/^local\.ytsubtitle\.reader(?:_|$)/.test(entries[i].name)) continue;
                var folder = new Folder(entries[i].fsName + '/PluginData');
                try {
                    var info = read(new File(folder.fsName + '/reader.json'));
                    if (info.protocol === 1 && typeof info.readerSession === 'string' && Math.abs(new Date().getTime() - info.updatedAt) < 8000 && (!newest || info.updatedAt > newest.updatedAt)) newest = { folder: folder, readerSession: info.readerSession, updatedAt: info.updatedAt };
                } catch (ignored) {}
            }
        }
        if (!newest) throw new Error('Transcript reader is not running. Reopen Premiere after installing the reader, or choose a JSON file.');
        return newest;
    }
    function requestTranscript(expected) {
        try {
            var current = getContext();
            if (!SubtitleIdentity.same(current, expected)) throw new Error('Sequence changed. Refresh the current transcript.');
            var reader = findReader();
            var id = new Date().getTime().toString(36) + '-' + Math.random().toString(36).slice(2);
            var request = { protocol: 1, id: id, type: 'readTranscript', readerSession: reader.readerSession, createdAt: new Date().getTime(), context: current };
            write(new File(reader.folder.fsName + '/request.json'), request);
            pending = { id: id, context: current, reader: reader };
            return JSON.stringify({ ok: true, requestId: id });
        } catch (error) { return JSON.stringify({ ok: false, error: String(error.message || error) }); }
    }
    function pollTranscript(id) {
        try {
            if (!pending || pending.id !== id) throw new Error('Transcript request was superseded.');
            var current = getContext();
            if (!SubtitleIdentity.same(current, pending.context)) throw new Error('Sequence changed while reading its transcript.');
            var response;
            try { response = read(new File(pending.reader.folder.fsName + '/response.json')); }
            catch (notReady) { return JSON.stringify({ ok: true, pending: true }); }
            if (response.protocol !== 1 || response.id !== id || response.readerSession !== pending.reader.readerSession) return JSON.stringify({ ok: true, pending: true });
            if (!response.ok) throw new Error(response.error || 'Premiere could not read this sequence transcript.');
            if (!SubtitleIdentity.same(response.context, current) || typeof response.json !== 'string') throw new Error('Discarded a transcript for a different project or sequence.');
            pending = null;
            return JSON.stringify({ ok: true, context: current, json: response.json, wordCount: response.wordCount, capturedAt: response.capturedAt });
        } catch (error) { return JSON.stringify({ ok: false, error: String(error.message || error) }); }
    }
    function sessionFile(context, create) {
        function token(value) {
            var text = SubtitleIdentity.guid(value);
            if (!/^[a-z0-9-]{1,100}$/.test(text)) throw new Error('Invalid saved-session identity.');
            return text;
        }
        var project = token(context.projectId), sequence = token(context.sequenceId), name = SubtitleIdentity.path(context.projectPath), hash = 0;
        for (var i = 0; i < name.length; i++) hash = ((hash * 31) + name.charCodeAt(i)) | 0;
        var parent = new Folder(Folder.userData.fsName + '/Adobe/YTSubtitleGenerator');
        var folder = new Folder(parent.fsName + '/sessions');
        if (create && ((!parent.exists && !parent.create()) || (!folder.exists && !folder.create()))) throw new Error('Could not create the sequence settings folder.');
        return new File(folder.fsName + '/' + project + '-' + (hash >>> 0).toString(16) + '-' + sequence + '.json');
    }
    function readSession(context) {
        try {
            var file = sessionFile(context, false), session = null;
            if (file.exists) {
                try { var saved = read(file); if (saved.schema === 1 && SubtitleIdentity.same(saved.context, context)) session = saved; }
                catch (invalidCache) {}
            }
            return JSON.stringify({ ok: true, session: session });
        } catch (error) { return JSON.stringify({ ok: false, error: String(error.message || error) }); }
    }
    function writeSession(session) {
        try {
            if (!session || session.schema !== 1 || !session.settings || (session.source !== 'premiere' && session.source !== 'manual')) throw new Error('Invalid saved-session data.');
            SubtitleAppearance.validate(session.settings.appearance);
            if (typeof session.settings.characters !== 'number' || session.settings.characters % 1 || session.settings.characters < 1 || session.settings.characters > 200 || typeof session.settings.singleWord !== 'boolean') throw new Error('Invalid saved phrase settings.');
            if (session.json !== null && (typeof session.json !== 'string' || session.json.length > 20000000)) throw new Error('Transcript snapshot is too large or invalid.');
            write(sessionFile(session.context, true), session);
            return JSON.stringify({ ok: true });
        } catch (error) { return JSON.stringify({ ok: false, error: String(error.message || error) }); }
    }
    return { requestTranscript: requestTranscript, pollTranscript: pollTranscript, readSession: readSession, writeSession: writeSession };
}
