# Premiere compatibility record

Recorded 2026-11-03. Task 1 is partially implemented and awaits host execution. Tasks 2–6 remain gated on the results.

## Local evidence

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

## Documented API findings

| Operation | Documented availability | Interpretation for 26.2.2 |
|---|---|---|
| Get active project and sequence | Since 25.6 | Candidate API; still needs host execution |
| Sequence project item | Since 25.6 | Candidate input for transcript export; corrected sequence transcript semantics unverified |
| Transcript JSON export | Since 25.6 | Probe uses this; no reliance on `hasTranscript`, which starts at 26.3 |
| Component parameter reads/actions | Since 25.6 | Read inspection available in the prototype; method presence is not a write test |
| `MogrtText` | Since 27.0 | Documented API is newer than target; do not depend on it for 26.2.2 |
| MOGRT insertion from path | Since 25.6 | Documented candidate; not invoked without a validated editable template |
| CEP/ExtendScript MOGRT control | Demonstrated in Adobe's PProPanel sample | Fallback candidate if target UXP cannot edit text; no claim of working on this host |

## Required host evidence

| Requirement | Status |
|---|---|
| Panel loads through UDT | Pending |
| Export includes corrected sequence words | Pending |
| Word times match edited sequence after source trim/cut/reorder | Pending |
| Active project/sequence identity reads and event invalidation work | Pending |
| Selected text and MOGRT parameter reads work | Pending |
| Actual text, active word, typography, position, highlight writes | Pending; needs follow-up write probe |
| Three graphics show identical phrase layout and changing active word | Pending; needs template and write support |
| Trim/duplicate/undo/save/reopen behavior | Pending |
| Persistent managed phrase identity and duplicate handling | Pending |

## Next decision

Load `prototype/manifest.json` and run the checks in `prototype/README.md`. Use the returned reports to choose the host mechanism. If UXP returns no editable text representation on 26.2.2, assess CEP/ExtendScript using documented MOGRT controls, rather than guessing at opaque buffers or silently requiring an upgrade. If both lack an essential operation, report that specific limitation before implementing the production panel.

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
