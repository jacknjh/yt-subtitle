# Premiere compatibility record

Recorded 2026-11-03. Transcript retrieval works through UXP. A separate CEP proof has now created editable template graphics and passed rendered-frame checks for cumulative word reveal. Native UXP text reads remain unavailable on 26.2.2. The full workflow and the rest of Task 1's persistence/undo checks are still incomplete. See [the verified graphics proof](mogrt-proof.md).

## Initial local inspection

| Check | Result | Evidence / limit |
|---|---|---|
| Premiere installed | Confirmed | `C:/Program Files/Adobe/Adobe Premiere Pro 2026/Adobe Premiere Pro.exe`: product 26.2.2, file 26.2.2.3 |
| Premiere running during inspection | Not observed | Process inspection returned no Premiere process |
| UXP Developer Tools | Not found in checked locations | Adobe installation directories, local Programs, and running processes checked; no exhaustive machine-wide search |
| CEP runtime present | Confirmed on disk | Premiere contains CEP and CEPHtmlEngine directories; not a functional extension-loading test |
| Ready-made subtitle MOGRT | Not available | No template supplied; no `.mogrt` found beneath the Premiere installation |
| Node | Confirmed | v24.13.0 |
| Local diagnostic tests | Passed | 12 tests; simulated host only |

No Adobe installation, registry, developer-mode setting, or existing extension was modified. Premiere was not launched by the agent.

## Host execution after developer-tool setup

The user opened Premiere and UXP Developer Tools. Read-only inspection confirmed:

- UXP Developer Tools product/file version: 2.3.0.5.
- Connected app: `premierepro`, Premiere Pro 26.2.2, runtime `uxp-9.2.1-local`.
- The host accepted the prototype manifest and returned a plugin session on load.
- The plugin JavaScript execution context was available and the panel status read `Ready. These checks leave the timeline unchanged.`
- `typeof require('premierepro').MogrtText` returned `undefined`, confirming that the documented text API cannot be used on this build.
- Initially both checks returned `Open a sequence in Premiere first.` After the user opened and transcribed a sequence, `readSequenceTranscript` returned 1,249 spoken-word records across 33 segments and one speaker, using the documented schema.
- Every spoken-word start/duration was finite and nonnegative. The first word starts at 0.56 seconds; the final word ends at 673.92 seconds, within the reported sequence duration of approximately 677.97 seconds. These bounds do not establish alignment against playback or after timeline edits.
- The transcript action was triggered in the live panel, making its summary and Save actions available to the user.
- After the user added typed text and selected the graphic, the graphics check returned an `AE.ADBE Text` component with 22 parameters. Its Source Text parameter returned null from `getStartValue`, while the other parameters returned values.
- A second read attempt using `getValueAtTime(TickTime.createWithSeconds(0))` failed with `getValueAtTime is not supported for these value types. Use GetKeyframeAtTime to get a keyframe object at time. The value can be extracted from the keyframe object.` Calling the documented `getKeyframePtr` method with the same time returned `Illegal Parameter type`.
- These results establish a limitation of the tested UXP access methods on this host, not a general inability of Premiere to generate/edit graphics. No writes were attempted. CEP/ExtendScript remains a fallback candidate that must be tested separately.

The developer-tool service was accessed through its existing loopback WebSocket and debugger connection. Adobe's npm command-line helper failed to install; the installed tool's service was used instead. No project/timeline mutation was performed.

## Documented API findings

| Operation | Documented availability | Interpretation for 26.2.2 |
|---|---|---|
| Get active project and sequence | Since 25.6 | Active project and sequence retrieved successfully |
| Sequence project item | Since 25.6 | Used successfully for transcript export; correction/edit semantics still unverified |
| Transcript JSON export | Since 25.6 | Exported 1,249 words from the active sequence; no reliance on `hasTranscript`, which starts at 26.3 |
| Component parameter reads/actions | Since 25.6 | Read inspection available in the prototype; method presence is not a write test |
| `MogrtText` | Since 27.0 | Confirmed undefined in the 26.2.2 runtime; do not depend on it |
| MOGRT insertion from path | Since 25.6 | Documented candidate; not invoked without a validated editable template |
| CEP/ExtendScript MOGRT control | Demonstrated in Adobe's PProPanel sample | Fallback candidate if target UXP cannot edit text; no claim of working on this host |

## Required host evidence

| Requirement | Status |
|---|---|
| Panel loads through UDT | Passed: manifest accepted, session created, plugin runtime evaluated |
| Transcript JSON retrieved from active sequence | Passed: 1,249 timed spoken-word records using documented schema |
| Export includes corrected sequence words | Pending |
| Word times match edited sequence after source trim/cut/reorder | Pending |
| Active project/sequence identity reads and event invalidation work | Pending |
| Selected graphic parameter reads | Passed for Opacity, Motion, Graphic Group, and non-text-value parameters of the Text component |
| Selected native graphic text reads through UXP | Failed with tested methods: Source Text null, alternate reads rejected |
| MOGRT text reads / CEP text reads | Pending; no template or CEP probe tested |
| Actual text, active word, typography, position, highlight writes | Pending; needs follow-up write probe |
| Three graphics show identical phrase layout and changing active word | Pending; needs template and write support |
| Trim/duplicate/undo/save/reopen behavior | Pending |
| Persistent managed phrase identity and duplicate handling | Pending |

### Subsequent CEP proof

The user installed/opened UXP Developer Tools and then loaded the separate Subtitle Graphics Proof CEP panel. CEP/ExtendScript successfully inserted the installed Karaoke MOGRT, set its Text JSON, read back each changed value, and applied the required style controls. Three adjacent frame-aligned clips were generated in a separate sequence. Exported PNG frames verified `I` → `I like` → `I like this`, with earlier words remaining visible and the current word highlighted.

This supersedes the table's pending MOGRT/CEP text-read status for that specific template. It does not establish arbitrary template compatibility, native UXP text support, a redistributable default template, or the complete transcript-to-graphics integration. The original edit was not overwritten. Experimental sequences/assets remain in the open project and no project save was performed automatically.

## Next decision

The prototype is loaded, transcript retrieval has passed, and a confirmed native text graphic has been inspected. The failed native Source Text reads do **not** establish that MOGRT insertion or exposed template controls are blocked. Previous user-facing explanations overstated the scope of that result.

The user identified Submachine's working SRT-plus-MOGRT workflow as the intended model. Its vendor documentation confirms template-driven word animation. Adobe's CEP sample demonstrates `importMGT`, `getMGTComponent`, and exposed parameter reads/writes. Assess that supported template route before concluding that graphics generation is unavailable on the target host. The exact internals of Submachine have not been inspected and must not be asserted.

Standard Adobe `Basic Title.mogrt` and `Basic Lower Third.mogrt` were found in the user's roaming Adobe/Common/Motion Graphics Templates directory. They are candidates for a basic insertion/text-write probe; neither has been imported or tested, and neither is established to support word reveal. No After Effects installation was found under the standard Adobe Program Files directory. A custom animated template is still a required deliverable; do not pretend an HTML panel alone produces a real .mogrt.

The next concrete milestone is a short editable graphic proof: insert a template, set a phrase, and change a word progression control across timed intervals. Test the graphics interface independently from transcript retrieval, then resolve the integration needed for the intended single-panel workflow. Do not build a large production UI before this proof works.

Do not guess at opaque buffers or silently require an upgrade. Also compare exported word timings with playback and confirm corrections made in the Text panel survive export. If both host mechanisms lack an essential operation, report that specific limitation before implementing the production panel.

The current prototype is read-only and cannot pass the full graphics gate by itself. Its purpose is to establish actual transcript data and parameter access before a focused write probe is designed around a real template.

## Primary references

- [UXP developer tooling](https://developer.adobe.com/premiere-pro/uxp/introduction/essentials/dev-tools/)
- [Official manifest example](https://github.com/AdobeDocs/uxp-premiere-pro-samples/blob/main/sample-panels/premiere-api/public/manifest.json)
- [Transcript](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/transcript)
- [Sequence](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/sequence)
- [MogrtText](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/mogrttext)
- [ComponentParam](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/componentparam)
- [SequenceEditor](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/sequenceeditor)
- [EventManager](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/eventmanager)
- [Adobe CEP PProPanel example](https://github.com/Adobe-CEP/Samples/blob/master/PProPanel/jsx/PPRO/Premiere.jsx)
- [Submachine's description of its template-driven workflow](https://submachine.gitbook.io/submachine/what-is-submachine)
