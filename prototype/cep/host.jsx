if (typeof JSON === 'undefined' && typeof $ !== 'undefined') {
    $.evalFile(new File($.fileName).parent.fsName + '/vendor/json2.js');
}

var YTSubtitle = (function () {
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

    function setControl(properties, name, value) {
        var parameter = properties.getParamForDisplayName(name);
        if (!parameter) throw new Error('Template is missing the required control: ' + name);
        parameter.setValue(value, true);
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
                var component = clip.getMGTComponent();
                if (!component) throw new Error('The inserted template exposes no MOGRT component.');
                var properties = component.properties;
                var parameter = properties.getParamForDisplayName('Text');
                if (!parameter) throw new Error('The template needs an exposed Text control.');
                changeText(parameter, states[index]);
                setControl(properties, 'Animation', false);
                setControl(properties, 'Fit in Title Safe', false);
                setControl(properties, 'Paragraph Alignment', 2);
                setControl(properties, 'Anchor X', 0);
                setControl(properties, 'Type-On Opacity', 100);
                setControl(properties, 'Active Word Opacity', 100);
                setControl(properties, 'Box Opacity', 0);
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

    return { inspect: inspect, createProof: createProof };
}());
