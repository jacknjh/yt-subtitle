# Editable word-reveal proof

Validated in Premiere Pro 26.2.2 on 2026-11-03. This establishes template insertion, editable text writes, timed clip placement, and cumulative single-line word reveal through CEP/ExtendScript. It is not the finished transcript-driven extension.

## Result

Three adjacent editable MOGRT clips were generated automatically on one video track in a separate test sequence:

| Text state | Start (seconds) | End (seconds) |
|---|---:|---:|
| I | 0 | 1.001 |
| I like | 1.001 | 2.002 |
| I like this | 2.002 | 3.003 |

The 29.97 fps preset uses 30 frames per interval. The existing source edit was not cleared, overwritten, or saved by the test. Experimental sequences and imported test assets were added to the open project during compatibility work; they have not been deleted automatically.

Text was read back from Premiere after each write. Full-resolution PNG frames were exported at 0.5, 1.5, and 2.5 seconds and inspected:

- [First word](proof/word-1.png)
- [Second word](proof/word-2.png)
- [Third word](proof/word-3.png)

The rendered result shows earlier words remaining visible while the current word is yellow. Pixel checks confirmed that the first word remains in the same region across all three frames and that future-word regions are empty before their intervals.

The proof uses an already installed, compatible landscape subtitle MOGRT in place. The template remains a separate local dependency. No After Effects installation is needed to execute this proof with the installed asset.

## Implementation

- `prototype/cep/host.jsx` creates a separate sequence using `Project.newSequence` and an installed preset, imports the template, writes its exposed Text JSON, sets style controls, and trims intervals using integer ticks aligned to the sequence timebase.
- Text JSON must contain `textEditValue` and uniform font styling. The font is preserved and its single text-run length updated. Unsupported values are rejected rather than decoded as binary data.
- Template settings: automatic Animation off, Fit in Title Safe off, left paragraph alignment, left anchor, Type-On Opacity 100, Active Word Opacity 100, Box Opacity 0.
- `json2.js` supplies standard JSON support on the target ExtendScript engine, which has no native JSON object. The file is public domain and loaded locally.
- The development installer copies only this panel into the user's CEP extension directory and records the previous CEP developer-mode value. On this machine the previous value was already `1`.
- Both the preset and MOGRT are passed to Premiere using native filesystem paths. Slash-form preset paths were rejected by the host; a regression test covers normalization through `File.fsName`.

There are 19 local tests in total, including host-independent checks for source-sequence isolation, unsupported text representations, partial insertion failures, JSON compatibility, and frame-aligned interval boundaries. Unit tests do not establish visual output; the PNG exports above provide that evidence.

## Remaining work

This is a fixed three-word proof. Automatic transcript-to-graphics generation, maximum characters per phrase, selected-graphic style copying, phrase-wide text updates, persisted sequence sessions, and production packaging remain unimplemented.

The prefix technique is limited to a single line. Future multi-line support must preserve the full phrase layout rather than wrap each growing prefix independently. The production extension also needs a compatible user-supplied or redistributable default template and a verified integration between the UXP transcript reader and the graphics interface.

Undo behavior, project save/reopen behavior, long-sequence performance, template availability on other machines, and compatibility outside 26.2.2 have not yet been verified.

## References

- [Load the CEP proof](../prototype/cep/README.md)
- [Adobe CEP template insertion and parameter example](https://github.com/Adobe-CEP/Samples/blob/master/PProPanel/jsx/PPRO/Premiere.jsx)
- [Preset-based sequence creation](https://ppro-scripting.docsforadobe.dev/general/project/#projectnewsequence)
- [Adobe UXP still-frame exporter](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/exporter)
