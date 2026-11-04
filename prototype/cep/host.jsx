var YTSubtitle = (function () {
    function initialize(extensionPath) {
        // The first manifest-loaded JSX cannot reliably use $.fileName to locate its dependencies.
        if (typeof JSON === 'undefined') $.evalFile(new File(extensionPath + '/vendor/json2.js'));
        if (typeof SubtitleAppearance === 'undefined' || SubtitleAppearance.defaults().lines === undefined || SubtitleAppearance.defaults().shadow !== undefined) $.evalFile(new File(extensionPath + '/appearance.js'));
        if (typeof SubtitleLayout === 'undefined') $.evalFile(new File(extensionPath + '/layout.js'));
        if (typeof SubtitleIdentity === 'undefined') $.evalFile(new File(extensionPath + '/identity.js'));
        if (typeof createSubtitleBridge === 'undefined') $.evalFile(new File(extensionPath + '/bridge.jsx'));
        if (!bridge) bridge = createSubtitleBridge(context);
    }
    var bridge = null;
    function timeAtTicks(ticks) { var value = new Time(); value.ticks = String(ticks); return value; }

    function changeText(parameter, text) {
        var data;
        try { data = JSON.parse(parameter.getValue()); } catch (error) {
            throw new Error('Unsupported template text representation. No text write was attempted.');
        }
        if (!data || typeof data.textEditValue !== 'string' ||
            (data.fontTextRunLength && data.fontTextRunLength.length !== 1)) {
            throw new Error('Unsupported template text representation or mixed font runs.');
        }
        data.textEditValue = text;
        if (data.fontTextRunLength) data.fontTextRunLength = [text.length];
        parameter.setValue(JSON.stringify(data), true);
        if (JSON.parse(parameter.getValue()).textEditValue !== text) throw new Error('Template text readback did not match the requested text.');
    }

    function setControl(properties, name, value, updateUI) {
        var parameter = properties.getParamForDisplayName(name);
        if (!parameter) throw new Error('Template is missing the required control: ' + name);
        parameter.setValue(value, updateUI === true);
    }

    function configureGraphic(clip, text, appearance, layout) {
        var component = clip.getMGTComponent();
        if (!component) throw new Error('The inserted template exposes no MOGRT component.');
        var properties = component.properties;
        var parameter = properties.getParamForDisplayName('Text');
        if (!parameter) throw new Error('The template needs an exposed Text control.');
        setControl(properties, 'Animation', false);
        setControl(properties, 'Fit in Title Safe', false);
        setControl(properties, 'Paragraph Alignment', 2);
        setControl(properties, 'Anchor X', 0);
        setControl(properties, 'Characters Per Line', 200);
        setControl(properties, 'Offset', [-0.35, 0.3]);
        setControl(properties, 'Type-On Opacity', 100);
        setControl(properties, 'Active Word Opacity', 100);
        setControl(properties, 'Box Opacity', 0);
        if (appearance) {
            setControl(properties, 'Anchor X', SubtitleAppearance.anchorX(appearance.alignment));
            var data = JSON.parse(parameter.getValue());
            if (!data.fontEditValue || data.fontEditValue.length !== 1) throw new Error('The template font cannot be edited uniformly.');
            data.fontEditValue = [appearance.font];
            parameter.setValue(JSON.stringify(data), false);
            var base = generation.baseSize;
            if (!base) {
                base = properties.getParamForDisplayName('Size').getValue();
                if (!base || base.length !== 2 || !data.fontSizeEditValue || typeof data.fontSizeEditValue[0] !== 'number' || data.fontSizeEditValue[0] <= 0) throw new Error('Template font scale is unsupported.');
                generation.baseSize = [base[0], base[1]];
                generation.baseFontSize = data.fontSizeEditValue[0];
            }
            var ratio = appearance.size / generation.baseFontSize;
            setControl(properties, 'Size', [base[0] * ratio, base[1] * ratio]);
            setControl(properties, 'Offset', [appearance.x / 100 - 0.5, appearance.y / 100 - 0.5]);
            var names = ['Fill Color', 'Active Word Color'];
            var colors = [appearance.textColor, appearance.mode === 'reveal' ? appearance.textColor : appearance.highlightColor];
            for (var n = 0; n < names.length; n++) {
                var color = properties.getParamForDisplayName(names[n]);
                if (!color) throw new Error('Template color control is missing: ' + names[n]);
                var hex = colors[n];
                color.setColorValue(color.getColorValue()[0], parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), false);
            }
        }
        if (layout) {
            SubtitleLayout.validate(layout);
            setControl(properties, 'Anchor X', layout.anchorX);
            setControl(properties, 'Anchor Y', layout.anchorY);
            setControl(properties, 'Paragraph Alignment', layout.paragraph);
            setControl(properties, 'Line Spacing', 0);
            setControl(properties, 'Offset', layout.offset);
        }
        changeText(parameter, text);
    }

    var generation = null;

    function context() {
        var sequence = app.project && app.project.activeSequence;
        if (!sequence) throw new Error('Open the sequence containing your transcript first.');
        return { projectId: app.project.documentID, sequenceId: sequence.sequenceID, sequenceName: sequence.name, projectPath: app.project.path, fps: 254016000000 / Number(sequence.timebase) };
    }

    function getContext() {
        try { return JSON.stringify({ ok: true, context: context() }); }
        catch (error) { return JSON.stringify({ ok: false, error: String(error.message || error) }); }
    }

    function loadTranscript() {
        try {
            var before = context();
            var file = File.openDialog('Load Premiere transcript JSON', '*.json', false);
            if (!file) return JSON.stringify({ ok: true, cancelled: true });
            if (!file.open('r')) throw new Error('Could not open the transcript file.');
            file.encoding = 'UTF-8';
            var json;
            try { json = file.read(); } finally { file.close(); }
            var after = context();
            if (before.sequenceId !== after.sequenceId || before.projectPath !== after.projectPath) throw new Error('Sequence changed while opening the transcript. Load it again.');
            return JSON.stringify({ ok: true, json: json, context: before });
        } catch (error) { return JSON.stringify({ ok: false, error: String(error.message || error) }); }
    }

    function beginGeneration(options) {
        try {
            generation = null;
            var current = context();
            if (!options || current.sequenceId !== options.sequenceId || current.projectPath !== options.projectPath) throw new Error('Switch back to the sequence used to load this transcript.');
            var appearance = options.appearance ? SubtitleAppearance.validate(options.appearance) : null;
            if (!/\.mogrt$/i.test(options.templatePath) || !new File(options.templatePath).exists) throw new Error('The local subtitle template is missing.');
            var source = app.project.activeSequence;
            var trackIndex = -1;
            // shortcut: require an empty top video track; add a track manually until public track creation is available.
            var lastTrack = source.videoTracks.numTracks - 1;
            if (lastTrack >= 0 && source.videoTracks[lastTrack].clips.numItems === 0) trackIndex = lastTrack;
            if (trackIndex < 0) throw new Error('Add an empty video track above your footage, then generate again.');
            for (var trackNumber = 0; trackNumber < source.videoTracks.numTracks; trackNumber++) {
                var sourceClips = source.videoTracks[trackNumber].clips;
                for (var clipNumber = 0; clipNumber < sourceClips.numItems; clipNumber++) if (/^Subtitle \d+: /.test(sourceClips[clipNumber].name)) throw new Error('This sequence already contains generated subtitles. Resume the unfinished run, or remove the previous generated graphics before starting again.');
            }
            var sequence = source;
            generation = { sequence: sequence, projectId: current.projectId, projectPath: current.projectPath, templatePath: new File(options.templatePath).fsName, trackIndex: trackIndex, count: 0, lastEnd: -1, projectItem: null, appearance: appearance, written: [] };
            return JSON.stringify({ ok: true, sequenceId: sequence.sequenceID, sequenceName: sequence.name, trackIndex: trackIndex });
        } catch (error) { return JSON.stringify({ ok: false, error: String(error.message || error) }); }
    }

    function insertBatch(sequenceId, clips) {
        var report = { ok: false, inserted: 0 };
        try {
            if (!generation || generation.sequence.sequenceID !== sequenceId) throw new Error('Generation session has expired.');
            if (!clips || !clips.length || clips.length > 10) throw new Error('Invalid generation batch.');
            var ticksPerFrame = Number(generation.sequence.timebase);
            for (var i = 0; i < clips.length; i++) {
                var current;
                try { current = context(); } catch (unavailable) { current = null; }
                if (!current || current.sequenceId !== sequenceId || current.projectId !== generation.projectId || current.projectPath !== generation.projectPath) {
                    report.paused = true; report.note = 'Return to “' + generation.sequence.name + '” and press Resume.'; break;
                }
                var track = generation.sequence.videoTracks[generation.trackIndex];
                var unchanged = track && track.clips.numItems === generation.written.length;
                if (unchanged && i === 0) for (var w = 0; w < generation.written.length; w++) {
                    var recorded = generation.written[w], actual = track.clips[w];
                    if (actual.nodeId !== recorded.id || Math.abs(actual.start.seconds - recorded.start) > 0.000001 || Math.abs(actual.end.seconds - recorded.end) > 0.000001) { unchanged = false; break; }
                }
                if (!unchanged) { report.paused = true; report.note = 'The subtitle track has changed. Restore its clips and timing before resuming, or discard this run.'; break; }
                var state = clips[i];
                if (generation.appearance && (generation.appearance.centeredReveal || generation.appearance.lines === 2) && !state.layout) throw new Error('This subtitle requires a measured layout. Refresh the preview before generating.');
                if (state.layout) SubtitleLayout.validate(state.layout);
                if (typeof state.text !== 'string' || !state.text.length || typeof state.startFrame !== 'number' || typeof state.endFrame !== 'number' || !isFinite(state.startFrame) || !isFinite(state.endFrame) || state.startFrame % 1 || state.endFrame % 1 || state.startFrame < 0 || state.endFrame <= state.startFrame || state.startFrame < generation.lastEnd) throw new Error('Invalid or overlapping subtitle timing.');
                var at = timeAtTicks(state.startFrame * ticksPerFrame);
                var clip;
                if (!generation.projectItem) {
                    clip = generation.sequence.importMGT(generation.templatePath, at.ticks, generation.trackIndex, 0);
                    if (clip) generation.projectItem = clip.projectItem;
                    if (!generation.projectItem) throw new Error('The imported template cannot be reused. Generation stopped instead of repeating imports.');
                } else {
                    var before = track.clips.numItems;
                    track.overwriteClip(generation.projectItem, at.seconds);
                    if (track.clips.numItems !== before + 1) throw new Error('Premiere could not create a separate reused subtitle instance.');
                    clip = track.clips[track.clips.numItems - 1];
                }
                if (!clip) throw new Error('Premiere could not insert the next subtitle.');
                if (Math.abs(clip.start.seconds - at.seconds) > ticksPerFrame / 254016000000 / 4) throw new Error('Premiere placed the reused subtitle at an unexpected time.');
                clip.end = timeAtTicks(state.endFrame * ticksPerFrame);
                configureGraphic(clip, state.text, generation.appearance, state.layout);
                clip.name = 'Subtitle ' + (state.phraseIndex + 1) + ': ' + state.text.replace(/\r\n|\r|\n/g, ' ');
                generation.written.push({ id: clip.nodeId, start: clip.start.seconds, end: clip.end.seconds });
                generation.lastEnd = state.endFrame;
                generation.count++;
                report.inserted++;
            }
            report.ok = true;
            report.total = generation.count;
        } catch (error) { report.error = String(error.message || error); generation = null; }
        return JSON.stringify(report);
    }

    function createProof(options) {
        if (typeof JSON === 'undefined') return '{"ok":false,"error":"ExtendScript JSON support is unavailable. No changes made."}';
        var report = { ok: false, clips: [] };
        try {
            if (!options || !/\.mogrt$/i.test(options.templatePath) || !new File(options.templatePath).exists) throw new Error('Choose an existing .mogrt template.');
            if (!/\.sqpreset$/i.test(options.presetPath) || !new File(options.presetPath).exists) throw new Error('The sequence preset is missing.');
            var templateFile = new File(options.templatePath);
            var presetFile = new File(options.presetPath);
            if (!app.project || !app.project.rootItem) throw new Error('Open a project first.');
            var original = app.project.activeSequence;
            report.sequenceName = 'Subtitle proof ' + new Date().getTime();
            var sequence = app.project.newSequence(report.sequenceName, presetFile.fsName);
            if (sequence) app.project.openSequence(sequence.sequenceID);
            if (!sequence || sequence.name !== report.sequenceName || (original && original.sequenceID === sequence.sequenceID)) throw new Error('Could not activate a separate test sequence. No graphics were inserted.');
            report.sequenceId = sequence.sequenceID;
            var ticksPerFrame = Number(sequence.timebase);
            if (!isFinite(ticksPerFrame) || ticksPerFrame <= 0) throw new Error('Could not read the test sequence frame rate.');
            var intervalTicks = Math.round(254016000000 / ticksPerFrame) * ticksPerFrame;
            // shortcut: single-line prefix proof; use full-phrase visibility controls before supporting wrapping.
            var states = ['I', 'I like', 'I like this'];
            for (var index = 0; index < states.length; index++) {
                if (!app.project.activeSequence || app.project.activeSequence.sequenceID !== sequence.sequenceID) throw new Error('Active sequence changed; generation stopped.');
                var clip = sequence.importMGT(templateFile.fsName, timeAtTicks(index * intervalTicks).ticks, 0, 0);
                if (!clip) throw new Error('Premiere could not insert template interval ' + (index + 1));
                configureGraphic(clip, states[index]);
                clip.end = timeAtTicks((index + 1) * intervalTicks);
                clip.name = 'Subtitle proof: ' + states[index];
                report.clips.push({ text: states[index], start: clip.start.seconds, end: clip.end.seconds });
            }
            report.ok = true;
            report.note = 'Text readback passed. Check playback for stable placement and visible word progression. Original sequence unchanged.';
        } catch (error) {
            report.error = String(error.message || error);
            report.note = 'Any partial inserts remain in the named test sequence. No existing sequence was cleared or overwritten.';
        }
        return JSON.stringify(report);
    }

    function inspect() {
        if (typeof JSON === 'undefined') return '{"ok":false,"error":"ExtendScript JSON support is unavailable."}';
        var report = { ok: false, version: app.version, components: [] };
        try {
            var sequence = app.project.activeSequence;
            if (!sequence) throw new Error('Open a sequence first.');
            var selected = sequence.getSelection();
            if (selected.length !== 1) throw new Error('Select exactly one text graphic or MOGRT.');
            var item = selected[0];
            report.sequenceName = sequence.name;
            for (var i = 0; i < item.components.numItems; i++) {
                var component = item.components[i];
                var details = { matchName: component.matchName, parameters: [] };
                for (var j = 0; j < component.properties.numItems; j++) {
                    var parameter = component.properties[j];
                    var entry = { name: parameter.displayName };
                    try {
                        var value = parameter.getValue();
                        entry.valueType = typeof value;
                        entry.empty = value === null || typeof value === 'undefined';
                        if (typeof value === 'string') {
                            try { var parsed = JSON.parse(value); entry.textEditableRepresentation = parsed && typeof parsed.textEditValue === 'string'; } catch (ignored) {}
                        }
                    } catch (readError) { entry.error = String(readError.message || readError); }
                    details.parameters.push(entry);
                }
                report.components.push(details);
            }
            report.ok = true;
        } catch (error) { report.error = String(error.message || error); }
        return JSON.stringify(report);
    }

    var savedStyle = null;
    var styleControls = ['Characters Per Line', 'Animation', 'Fit in Title Safe', 'Offset', 'Size', 'Paragraph Alignment', 'Anchor X', 'Anchor Y', 'Line Spacing', 'Character Spacing', 'Word Spacing', 'Stroke Width', 'Type-On Opacity', 'Active Word Opacity', 'Active Word Stroke On/Off', 'Box Padding', 'Box Offset', 'Box Stroke Width', 'Box Roundness', 'Box Opacity'];
    var styleColors = ['Fill Color', 'Stroke Color', 'Active Word Color', 'Box Fill', 'Box Stroke'];

    function graphicProperties(clip) {
        var component = clip.getMGTComponent();
        if (!component) throw new Error('Select subtitle template graphics only.');
        var properties = component.properties;
        if (!properties.getParamForDisplayName('Text')) throw new Error('Selected graphic has no editable Text control.');
        return properties;
    }

    function captureStyle(source) {
        savedStyle = null;
        try {
            var current = context();
            var selection = source ? [source] : app.project.activeSequence.getSelection();
            if (selection.length !== 1) throw new Error('Select one subtitle graphic as the style source.');
            var properties = graphicProperties(selection[0]);
            var text = JSON.parse(properties.getParamForDisplayName('Text').getValue());
            if (!text.fontTextRunLength || text.fontTextRunLength.length !== 1) throw new Error('Mixed text formatting is not supported for style copying.');
            var values = {};
            for (var i = 0; i < styleControls.length; i++) {
                var parameter = properties.getParamForDisplayName(styleControls[i]);
                if (!parameter || parameter.isTimeVarying()) throw new Error('Style source has unsupported or animated controls.');
                values[styleControls[i]] = parameter.getValue();
            }
            var colors = {};
            for (var c = 0; c < styleColors.length; c++) {
                var color = properties.getParamForDisplayName(styleColors[c]);
                if (!color || color.isTimeVarying()) throw new Error('Style source has unsupported or animated colors.');
                colors[styleColors[c]] = color.getColorValue();
            }
            savedStyle = { context: current, text: text, values: values, colors: colors };
            return JSON.stringify({ ok: true, note: 'Style source captured. Select subtitle graphics and apply it. Text and timing are preserved.' });
        } catch (error) { return JSON.stringify({ ok: false, error: String(error.message || error) }); }
    }

    function applyStyle() {
        var updated = 0;
        try {
            var current = context();
            if (!savedStyle || current.sequenceId !== savedStyle.context.sequenceId || current.projectPath !== savedStyle.context.projectPath) throw new Error('Capture a style source in this sequence first.');
            var selection = app.project.activeSequence.getSelection();
            if (!selection.length) throw new Error('Select the subtitle graphics to style.');
            var targets = [];
            var i, j;
            for (i = 0; i < selection.length; i++) {
                var properties = graphicProperties(selection[i]);
                var textParameter = properties.getParamForDisplayName('Text');
                var text = JSON.parse(textParameter.getValue());
                if (typeof text.textEditValue !== 'string' || !text.fontTextRunLength || text.fontTextRunLength.length !== 1) throw new Error('A selected graphic has unsupported text formatting.');
                for (j = 0; j < styleControls.length; j++) {
                    var control = properties.getParamForDisplayName(styleControls[j]);
                    if (!control || control.isTimeVarying()) throw new Error('A selected graphic has unsupported or animated style controls.');
                }
                for (j = 0; j < styleColors.length; j++) {
                    var color = properties.getParamForDisplayName(styleColors[j]);
                    if (!color || color.isTimeVarying()) throw new Error('A selected graphic has unsupported or animated colors.');
                }
                targets.push({ properties: properties, parameter: textParameter, text: text });
            }
            for (i = 0; i < targets.length; i++) {
                var target = targets[i];
                for (var key in savedStyle.text) if (savedStyle.text.hasOwnProperty(key) && /^font/.test(key) && key !== 'fontTextRunLength') target.text[key] = savedStyle.text[key];
                target.parameter.setValue(JSON.stringify(target.text), true);
                for (j = 0; j < styleControls.length; j++) setControl(target.properties, styleControls[j], savedStyle.values[styleControls[j]]);
                for (j = 0; j < styleColors.length; j++) {
                    var rgba = savedStyle.colors[styleColors[j]];
                    target.properties.getParamForDisplayName(styleColors[j]).setColorValue(rgba[0], rgba[1], rgba[2], rgba[3], true);
                }
                updated++;
            }
            return JSON.stringify({ ok: true, note: 'Applied typography, colors, spacing, position and template animation settings to ' + updated + ' selected graphics.' });
        } catch (error) { return JSON.stringify({ ok: false, error: String(error.message || error) + ' Updated ' + updated + ' graphics before stopping.' }); }
    }

    var parent = null;
    function setParentFromPlayhead() {
        parent = null;
        try {
            var current = context(), sequence = app.project.activeSequence;
            var seconds = sequence.getPlayerPosition().seconds;
            var matches = [], selection = sequence.getSelection();
            for (var t = 0; t < sequence.videoTracks.numTracks; t++) {
                var clips = sequence.videoTracks[t].clips;
                for (var i = 0; i < clips.numItems; i++) if (/^Subtitle \d+: /.test(clips[i].name) && clips[i].start.seconds <= seconds && clips[i].end.seconds > seconds) matches.push(clips[i]);
            }
            if (!matches.length) throw new Error('Move the playhead over a generated subtitle graphic.');
            var candidate = matches.length === 1 ? matches[0] : null;
            if (!candidate && selection.length === 1) for (var j = 0; j < matches.length; j++) if (matches[j].nodeId === selection[0].nodeId) candidate = matches[j];
            if (!candidate) throw new Error('Multiple subtitle graphics are under the playhead. Select one of them, then set the parent.');
            var captured = JSON.parse(captureStyle(candidate));
            if (!captured.ok) throw new Error(captured.error);
            parent = { context: current, nodeId: candidate.nodeId, name: candidate.name };
            return JSON.stringify({ ok: true, parentName: candidate.name, note: 'Parent set: ' + candidate.name + '. Sync selected reads its latest style.' });
        } catch (error) { return JSON.stringify({ ok: false, error: String(error.message || error) }); }
    }

    function syncSelectedToParent() {
        try {
            var current = context();
            if (!parent || current.sequenceId !== parent.context.sequenceId || current.projectPath !== parent.context.projectPath) throw new Error('Set a parent in this sequence first.');
            var source = null, sequence = app.project.activeSequence;
            for (var t = 0; t < sequence.videoTracks.numTracks; t++) {
                var clips = sequence.videoTracks[t].clips;
                for (var i = 0; i < clips.numItems; i++) if (clips[i].nodeId === parent.nodeId) source = clips[i];
            }
            if (!source) throw new Error('The parent graphic was removed. Set another parent.');
            var captured = JSON.parse(captureStyle(source));
            if (!captured.ok) throw new Error(captured.error);
            return applyStyle();
        } catch (error) { return JSON.stringify({ ok: false, error: String(error.message || error) }); }
    }

    function selectedPhrase() {
        var sequence = app.project.activeSequence;
        var selection = sequence.getSelection();
        if (selection.length !== 1) throw new Error('Select one generated subtitle graphic in the phrase.');
        var match = /^Subtitle (\d+): /.exec(selection[0].name);
        if (!match) throw new Error('This graphic has no generated phrase identifier.');
        var prefix = 'Subtitle ' + match[1] + ': ';
        var clips = [];
        for (var t = 0; t < sequence.videoTracks.numTracks; t++) {
            var track = sequence.videoTracks[t];
            for (var i = 0; i < track.clips.numItems; i++) if (track.clips[i].name.indexOf(prefix) === 0) clips.push(track.clips[i]);
        }
        clips.sort(function (a, b) { return a.start.seconds - b.start.seconds; });
        for (var k = 1; k < clips.length; k++) if (clips[k].start.seconds < clips[k - 1].end.seconds) throw new Error('Phrase graphics overlap. Move or trim duplicated word graphics before updating the phrase.');
        return { prefix: prefix, clips: clips };
    }

    function readPhrase() {
        try {
            var current = context();
            var phrase = selectedPhrase();
            var text = JSON.parse(graphicProperties(phrase.clips[phrase.clips.length - 1]).getParamForDisplayName('Text').getValue()).textEditValue;
            return JSON.stringify({ ok: true, context: current, prefix: phrase.prefix, text: text, wordCount: phrase.clips.length });
        } catch (error) { return JSON.stringify({ ok: false, error: String(error.message || error) }); }
    }

    function updatePhrase(options) {
        var updated = 0;
        try {
            var current = context();
            if (!options || current.sequenceId !== options.context.sequenceId || current.projectPath !== options.context.projectPath) throw new Error('Sequence changed. Read the selected phrase again.');
            var phrase = selectedPhrase();
            if (phrase.prefix !== options.prefix) throw new Error('Selection changed. Read the selected phrase again.');
            var raw = String(options.text || '').replace(/^\s+|\s+$/g, ''), rows = raw.split(/\r\n|\r|\n/);
            if (rows.length > 2) throw new Error('A phrase can contain at most two lines.');
            var words = raw.split(/\s+/);
            if (!words[0] || words.length !== phrase.clips.length) throw new Error('This phrase has ' + phrase.clips.length + ' timed graphics. Enter that many words, or duplicate/delete word graphics on the timeline first.');
            for (var i = 0; i < phrase.clips.length; i++) {
                var text = JSON.parse(graphicProperties(phrase.clips[i]).getParamForDisplayName('Text').getValue());
                if (typeof text.textEditValue !== 'string' || !text.fontTextRunLength || text.fontTextRunLength.length !== 1) throw new Error('Unsupported phrase text formatting.');
            }
            var previous = JSON.parse(graphicProperties(phrase.clips[phrase.clips.length - 1]).getParamForDisplayName('Text').getValue()).textEditValue.split(/\r\n|\r|\n/);
            var breakAt = rows.length === 2 ? rows[0].replace(/^\s+|\s+$/g, '').split(/\s+/).length : previous.length === 2 ? previous[0].replace(/^\s+|\s+$/g, '').split(/\s+/).length : words.length;
            for (var j = 0; j < phrase.clips.length; j++) {
                var prefixText = words.slice(0, Math.min(j + 1, breakAt)).join(' ');
                if (j + 1 > breakAt) prefixText += '\r' + words.slice(breakAt, j + 1).join(' ');
                changeText(graphicProperties(phrase.clips[j]).getParamForDisplayName('Text'), prefixText);
                phrase.clips[j].name = phrase.prefix + prefixText.replace(/\r/g, ' ');
                updated++;
            }
            return JSON.stringify({ ok: true, note: 'Updated ' + updated + ' word graphics. Their timing and individual styles are preserved.' });
        } catch (error) { return JSON.stringify({ ok: false, error: String(error.message || error) + ' Updated ' + updated + ' graphics before stopping.' }); }
    }

    return { apiVersion: 7, initialize: initialize, inspect: inspect, createProof: createProof, getContext: getContext, loadTranscript: loadTranscript, beginGeneration: beginGeneration, insertBatch: insertBatch, captureStyle: captureStyle, applyStyle: applyStyle, setParentFromPlayhead: setParentFromPlayhead, syncSelectedToParent: syncSelectedToParent, readPhrase: readPhrase, updatePhrase: updatePhrase,
        requestTranscript: function (context) { return bridge.requestTranscript(context); },
        pollTranscript: function (id) { return bridge.pollTranscript(id); },
        readSession: function (context) { return bridge.readSession(context); },
        writeSession: function (session) { return bridge.writeSession(session); }
    };
}());
