# Premiere compatibility record

Updated November 5, 2026. **Premiere Pro 26.2.2 on Windows is the only tested host.** The installed CEP generator and background UXP reader work together on that setup. Earlier notes describing a read-only proof or an unresolved graphics gate have been superseded by native generation and rendered-frame checks.

## Version eligibility and actual support

| Component | Current requirement | What this establishes |
| --- | --- | --- |
| [CEP panel manifest](../prototype/cep/CSXS/manifest.xml) | PPRO `[26.2,27.0)`, CSXS 12.0 | Declares loading eligibility from 26.2 through versions below 27.0. |
| [UXP reader manifest](../prototype/manifest.json) | Premiere minimum 26.2.2; startup load event | Requires at least 26.2.2 for the installed reader. |
| Combined workflow | 26.2.2 up to, excluding, 27.0 | Manifest intersection only; other builds have not been tested. |
| [Windows installer](../prototype/cep/install-dev.ps1) | Detects Premiere from running instances/standard folders; allows explicit paths or file pickers; checks compatible MOGRT controls | Windows only. Template is supplied separately; structure validation is not a render-compatibility test. |

The installed host reports product version 26.2.2 and executable file version 26.2.2.3. The inspected UXP runtime was `uxp-9.2.1-local`. No claim is made for other 26.x builds, Premiere 27.x, earlier releases or macOS. Widening a manifest does not verify host APIs, template behavior or startup. The portable installer now resolves locations instead of requiring this machine's Premiere path; the optional sequence preset is used only by developer diagnostics.

## Verified on the tested host

| Area | Evidence and practical scope |
| --- | --- |
| Installation and reopening | CEP panel installed; background reader installed and verified at Premiere startup. Normal use does not require UXP Developer Tools or opening a reader panel. |
| Sequence transcript | Native UXP export returns timed words from the active sequence. The mailbox checks reader session, request and sequence identity; it does not substitute an arbitrary source clip. |
| Persistence | Appearance, grouping and transcript snapshots are scoped by project and sequence. Cached automatic snapshots refresh before generation; manual JSON remains a fallback. |
| Editable graphics | CEP inserts the installed Karaoke MOGRT, writes text and supported controls, and reuses independently editable instances. Output uses an empty top video track in the active sequence. |
| Word reveal | Exported frames verify cumulative word visibility and optional highlighting. Native frame alignment and template text readback are checked. |
| Alignment and two lines | Render checks cover Left/Center/Right, reserved completed-phrase geometry, stable line breaks and highlighted words on a second line. See the detailed workflow record for bounds and measurement limits. |
| Pause and resume | Host guards and UI tests cover retaining a frozen run, switching sequences, avoiding duplicate inserts and refusing resume after output-track changes. Progress is retained only while the panel stays open. |
| Parent Sync | Copies the selected template's static typography and controls to selected destinations while retaining their text and timing. It rereads the parent's latest supported style. Separate effects and keyframes are outside its scope. |
| Phrase updates | Rewrites associated generated word graphics while retaining their timeline boundaries; word-count changes require matching clip duplication/deletion. |
| Panel UI | Pinned preview, collapsible Style sections, field validation, numeric dragging, Ctrl+Z / Ctrl+Shift+Z, per-sequence history, narrow layouts and 200% text checks. Header Undo/Redo buttons have been removed. |

The temporary native test sequences used for recent render checks were removed and the original sequence restored. The withdrawn shadow prototype is not part of the current UI or generator. Existing timeline effects are not removed by this change.

## Why CEP and UXP are both used

The reader uses UXP for transcript export. The CEP panel uses ExtendScript for the tested MOGRT text and style writes.

On 26.2.2, the tested UXP Source Text accessors returned null or rejected alternate reads. `require('premierepro').MogrtText` was undefined. Adobe documents [MogrtText as available since 27.0](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/mogrttext). That newer API is not required by this generator, and its documented availability does not establish 27.x compatibility.

## Still unverified or limited

- Other Premiere builds, operating systems, installation locations and arbitrary MOGRTs.
- Systematic transcript timing/correction comparisons after every combination of source trims, cuts and reordering. The editor should inspect timing on the timeline.
- Portrait output and other aspect ratios beyond the tested landscape template.
- Full-video throughput after the latest UI changes; no general performance benchmark is claimed.
- Screen-reader speech and complete assistive-technology integration with Premiere. Automated accessibility results are not full WCAG conformance.
- Recovery of an unfinished generation after restarting the panel or Premiere. Saved appearance persists; resume state and settings undo history do not.
- Redistribution of a default template. The currently required third-party MOGRT is not bundled.

The repository currently has **105 passing automated tests**. Simulated-host tests establish regression coverage, not compatibility with hosts that were never run.

## When testing another version

Use a copy of a short project. Check reader startup, transcript refresh, three or four generated word states, editable text/style controls, phrase updates, Parent Sync, sequence switching and pause/resume. Compare rendered frames, confirm a saved project reopens correctly, and record the exact host/runtime versions before changing the tested-support statement.

## Further evidence

- [Generator workflow and native render checks](transcript-generator.md)
- [UI review](ui-polish-review.md)
- [Earlier MOGRT proof](mogrt-proof.md)
- [Adobe Transcript API](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/transcript)
- [Adobe CEP example](https://github.com/Adobe-CEP/Samples/blob/master/PProPanel/jsx/PPRO/Premiere.jsx)

## Portable installer and release build

The root Install.cmd/Install.ps1 entry point installs the panel and reader using user-scoped paths. A compatible locally supplied MOGRT is required. The installer validates controls and version bounds before installation, records the prior CEP developer-mode setting and leaves saved sequence data intact. Normal installs do not enable the development debugger; developer installs can explicitly request it.

The release builder creates a versioned ZIP and SHA-256 checksum using an explicit allowlist. Regression checks cover invalid/missing templates, retained template choices, version bounds, excluded template/private/debug files and the checksum. Local preflight is read-only. Fresh-machine installation and other Premiere builds remain unverified; the package contains no MOGRT and requires a compatible template supplied separately.
