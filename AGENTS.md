# AGENTS.md — Slide Coordinate Studio

## 1. Scope and purpose

This file supplies project-wide instructions and continuity for agents working on **Slide Coordinate Studio**, the PowerPoint layout-coordinate tool developed in this conversation.

Place this file at the repository root beside `index.html`. Its instructions apply to the entire project, including application code, geometry, exporters, examples, tests, documentation and release archives. A more specific `AGENTS.md` may add instructions for its own subtree. Follow explicit current user instructions when they change a requirement described here.

The conversation exists within a wider workspace/project named Areeb. This file governs Slide Coordinate Studio; it does not assign requirements to unrelated event-design or other Areeb projects.

The user's objective is to stop manually guessing element positions in Python or other presentation-generation scripts. The tool should let them visually arrange objects, obtain accurate measurements and connect those measurements to script-created objects.

## 2. Requirements established in this chat

The user requested:

1. A visual editor that supports multiple elements on a fixed-size slide whose dimensions can later change.
2. A copy button for element coordinates usable in automation scripts.
3. A coordinate system compatible with Microsoft PowerPoint conventions, with the relationship to Word/Excel explained accurately.
4. A compatible technology stack, a downloadable source-code ZIP, documentation, useful diagrams and `.gitignore`.
5. Detailed consideration of edge cases that could make the tool unreliable.
6. A detailed usage README.
7. An explicit explanation of how saved tool coordinates map to elements created by a Python script.
8. A worked example in which an image filename supplies heading text, while the heading frame and image frame follow their own saved coordinates.
9. This project-wide `AGENTS.md` capturing the conversation and project context.

Treat documentation and Python binding examples as first-class deliverables. Generic startup instructions alone do not satisfy the mapping requirement.

Do not claim that every possible edge case has been eliminated. Identify implemented protections, known limitations and unverified behavior precisely.

## 3. Current architecture

The browser editor uses **plain HTML, CSS and JavaScript** with native DOM and pointer APIs.

- No framework or runtime frontend dependencies.
- No build step.
- No backend, accounts, telemetry, CDN or network assets.
- Works from an extracted folder through `index.html`; optional loopback static serving is available.
- Microsoft Office, Python and Node are not required for the editor itself.
- Python/Node and presentation libraries are separate requirements for executing exports or development tools.

Preserve this offline, low-installation-friction workflow. Do not add a framework, desktop wrapper, hosted backend or native Office integration solely for convenience. If a requested feature justifies such a change, explain the tradeoff and keep the local workflow where practical.

Classic scripts are intentional: they avoid module-loading restrictions associated with `file://`. `core.js` exposes `LayoutCore` in the browser and `module.exports` in Node.

### Project files

| Path | Responsibility |
| --- | --- |
| `index.html` | App shell, labelled controls and script loading |
| `src/app.js` | State, selection, gestures, Inspector, history, downloads, clipboard and recovery |
| `src/core.js` | Unit conversion, geometry, constraints, resizing, validation and exporters |
| `src/styles.css` | Layout and canvas styling |
| `examples/demo-layout.json` | Full reopenable layout with an embedded sample image |
| `examples/demo_export.py` | Generated Python example |
| `examples/demo_export.cjs` | Generated PptxGenJS example |
| `examples/export-layout.cjs` | Headless JSON-to-script export CLI |
| `tests/core.test.cjs` | Geometry, conversions, validation and exporter checks |
| `tests/browser.test.cjs` | Optional Playwright interaction checks |
| `tests/export_roundtrip.py` | Generate PPTX and reopen it to inspect geometry/content |
| `docs/USER_GUIDE.md` | Control behavior and shortcuts |
| `docs/COORDINATES.md` | Coordinate mathematics and Office distinctions |
| `docs/ARCHITECTURE.md` | Components and model contract |
| `docs/EDGE_CASES.md` | Protections, limits and troubleshooting |
| `docs/TESTING.md` | Actual verification results and pending checks |
| `docs/ROADMAP.md` | Proposed features, clearly separated from implemented behavior |
| `docs/*.svg` | Coordinate, rotation and architecture diagrams |
| `README.md` | Project overview and entry-point documentation |
| `package.json` | Optional development scripts; Node 18+ |
| `.gitignore` | Generated files, dependencies and local environment exclusions |
| `LICENSE` | MIT license |

## 4. Coordinate invariants

These are central to the project's correctness:

1. **The model stores all positional lengths in inches.**
2. The origin is the top-left of the slide; X increases rightward and Y downward.
3. Screen pixels are view coordinates only. Zoom, monitor scaling and device pixel ratio must never alter stored or exported geometry.
4. Font size always uses points.
5. X/Y/width/height describe an object's unrotated frame. Rotation is a separate angle around the frame centre.
6. Rotated visible bounds are computed separately for alignment and boundary constraints.
7. EMU output is integer-rounded; avoid rounding internal geometry unnecessarily.
8. Inspector display rounding must not mutate the model until an explicit edit is committed.

### Unit conversion

| Unit | Units per inch |
| --- | ---: |
| Inches | 1 |
| Centimetres | 2.54 |
| Millimetres | 25.4 |
| Points | 72 |
| EMU | 914400 |

One point equals 12,700 EMUs.

Use shared conversion helpers in `core.js`. Do not maintain a separate conversion implementation in the UI, CLI or each exporter.

At 100% view the editor uses 96 CSS pixels per inch as a display convention. It is not a physically calibrated on-screen ruler. Do not introduce pixel export without an explicit DPI contract.

### Rotation mathematics

For frame width `w`, height `h` and angle `a`:

```text
visible_width  = abs(cos(a)) * w + abs(sin(a)) * h
visible_height = abs(sin(a)) * w + abs(cos(a)) * h
centre_x = x + w / 2
centre_y = y + h / 2
visible_x = centre_x - visible_width / 2
visible_y = centre_y - visible_height / 2
```

Corner-resize movement must be transformed into the element's rotated local axes. Never export the DOM's screen-space `getBoundingClientRect()` as document geometry.

## 5. Model contract

The current schema is version 1:

```json
{
  "version": 1,
  "unit": "in",
  "slide": {
    "w": 13.333333333333334,
    "h": 7.5,
    "background": "#ffffff"
  },
  "elements": []
}
```

Every element includes:

```text
id, type, name, x, y, w, h, rotation,
text, fontSize, fontFamily, fill, color, locked, hidden
```

Image elements additionally contain `src`, an embedded PNG/JPEG base64 data URI.

Supported types: `text`, `rect`, `ellipse`, `image`.

The elements array is ordered from back to front. Reordering layers must preserve that contract in canvas rendering and exports.

- IDs are unique stable identifiers.
- Names are editable human-readable labels and can serve as script-binding keys.
- A name is not an automatic binding to a Python variable, file or existing Office shape.
- Full Save JSON files are versioned projects; coordinate-only JSON downloads are arrays and cannot be opened as complete projects.
- Zoom, current selection, display unit and grid/aspect preferences are UI state, not version-1 project fields.

If a change introduces an incompatible schema, add a version and explicit migration/rejection behavior. Do not silently reinterpret old coordinates.

## 6. Required Python mapping workflow

The user specifically needs dynamic script content to follow saved visual coordinates.

The documented binding convention uses:

| Tool Name | Expected type | Python object | Dynamic content |
| --- | --- | --- | --- |
| `Heading` | `text` | `heading_shape` | Image filename without extension |
| `Main image` | `image` | `image_shape` | Actual selected PNG/JPEG file |

These example names are case-sensitive binding keys, not reserved application names. Users may choose others if their code uses the same strings.

### Binding requirements

1. Locate slots by an explicit name or stable ID, not by array index.
2. Reject a missing slot or ambiguous duplicate name instead of silently choosing the first match.
3. Verify the expected element type.
4. State whether a hidden slot is rejected, ignored or deliberately used as a non-rendering anchor. The documented example rejects hidden required slots.
5. Read geometry from the saved full project in inches.
6. Apply X/Y/width/height to both newly created and already-existing Python shapes.
7. Keep content-generation logic separate from geometry.
8. Apply text styling after assigning text when needed; replacing text can reset run formatting.
9. Match the presentation's slide dimensions to the saved slide dimensions.

### Geometry assignment

```python
shape.left = Inches(slot["x"])
shape.top = Inches(slot["y"])
shape.width = Inches(slot["w"])
shape.height = Inches(slot["h"])
shape.rotation = slot["rotation"]
shape.name = slot["name"]
```

### Filename heading

```python
heading_text = image_path.stem.replace("_", " ").replace("-", " ")
```

For `Speaker_Name.jpg`, this produces `Speaker Name`. Do not confuse that content value with the slot's Name `Heading`.

The complete documented example creates one slide per image, maps the heading and image frames, uses the saved background and retains their relative stacking order. It intentionally ignores other static elements; say so clearly. To preserve all decorations, extend the mapper or substitute dynamic content into a full exported script.

A replacement image with a different aspect ratio can stretch because both dimensions are supplied. Preserve-aspect UI preference is not a persisted crop/fit rule. Do not promise cropping or automatic image fitting that has not been implemented.

## 7. Existing behavior to preserve

- Text, rectangles, ellipses and local PNG/JPEG images.
- Four-corner resizing, exact Inspector edits and clockwise rotation.
- Shift-click multi-selection and layer-list selection of obscured objects.
- Grid display and snapping; grid interval is explicitly entered in inches.
- Numeric edits and keyboard nudges bypass snapping.
- Single-object alignment targets the slide; multi-object alignment targets combined rotated visible bounds.
- Locks block direct element movement/edit/duplicate/delete. Global slide transforms and history restoration can affect locked elements.
- Hidden objects remain in full JSON but are excluded from Python/JavaScript exports.
- Front/back ordering preserves relative order within a moved set.
- Pointer cancellation and Escape restore a cancelled gesture. Completed gestures create one undo entry.
- Boundary constraints use rotated bounds. Oversized objects centre along the affected axis and still warn.
- Group movement without constraints preserves relative spacing; individual Keep inside constraints can change that spacing.
- Clipboard denial falls back to selecting output for manual copying.
- Failed imports and invalid edits retain the previous valid project.

### Slide resize policies

| Policy | Geometry | Font behavior |
| --- | --- | --- |
| Keep | Preserve element positions and sizes | Preserve font size |
| Uniform fit | Uniform scale plus centred offset | Same uniform scale |
| Stretch | Independent X/Y scaling | Smaller axis scale |

Do not silently switch between these policies. Retain atomic rejection if a transform yields unsupported geometry/font values.

## 8. Current limits and input handling

These are current application defaults. A deliberate change may adjust them, but must update validation, tests and documentation together.

| Limit | Current value |
| --- | --- |
| Slides | 1 |
| Elements | At most 500 |
| Slide dimensions | 1–56 inches per axis |
| Element dimensions | 0.01–112 inches |
| X/Y | ±112 inches |
| Rotation | ±360 degrees |
| Font size | 1–1000 points |
| Uploaded raster file | At most 10,000,000 bytes |
| Decoded image | At most 50 megapixels |
| Import file | At most 25,000,000 bytes |
| Serialized model | At most 25,000,000 characters |
| Autosave budget | Roughly 4,000,000 serialized characters |
| History | At most 50 snapshots; roughly 20,000,000-character retention budget, with one larger snapshot permitted |

Bytes and JavaScript string-character counts are different. Avoid documenting them as interchangeable exact measurements.

Validate finite numbers, supported types, unique IDs, valid colours and embedded image URI forms. Browser import also decodes images; pure Node validation does not fully decode image bytes.

Render user text as text, not HTML. Serialize strings safely in generated code. Do not turn uploaded paths or text into executable source through unsafe interpolation.

Unsupported SVG/GIF/WebP and remote URLs are currently rejected. Supporting them requires an explicit asset/export strategy rather than a MIME-string change alone.

## 9. Persistence and exports

### Persistence

Full JSON download is the portable backup. Local browser storage is best-effort recovery only.

Document storage denial, quota limits, stale smaller autosaves, browser cleanup and multiple-tab last-writer-wins behavior. History is not persisted across sessions. Do not claim that a previous downloaded file is updated automatically.

### Export contracts

- **Python:** python-pptx, custom slide size, blank slide, visible objects in model order, zero text margins, explicit supported font properties, embedded images, `layout.pptx` output.
- **JavaScript:** PptxGenJS CommonJS `.cjs`, custom layout, numeric inches, zero text margins, embedded image data, visible objects in model order.
- **Coordinate JSON:** identity/type/name, unit-labelled frame geometry and rotation. Rounded for readability; does not include full project content.
- **VBA:** point assignments to an existing `shp` variable. Not a complete macro or shape generator.

Selected Python/JavaScript output includes presentation setup. Full-layout code export includes all visible objects. Coordinate/VBA exports can include hidden model objects.

Generated scripts save relative to their runtime working directory and can overwrite an existing PPTX output. Explain filename changes and working directories. The headless CLI uses exclusive writes for scripts and refuses to overwrite them.

## 10. Word, Excel and typography distinctions

PowerPoint provides a slide-origin coordinate model. Word requires page/margin/paragraph positioning and wrapping context. Excel requires worksheet/cell placement context. Shared units do not make these origins interchangeable.

Do not describe Word/Excel support as implemented. Point/EMU output can support a future adapter after its anchoring contract is defined.

The editor is not a PowerPoint rendering engine. Precise frame geometry does not guarantee identical font metrics, line breaking, emoji rendering or text overflow across browser and Office.

Fonts are not embedded. Text autofit, rich text and image cropping are not implemented. Never conceal those limitations with unsupported claims about pixel-identical output.

## 11. Coding and change workflow

1. Read the relevant source and documentation before modifying behavior.
2. Use `core.js` for shared mathematics, validation and export logic.
3. Keep UI concerns in `app.js` and styling in CSS.
4. Prefer small, understandable changes over a wholesale rewrite.
5. Avoid introducing runtime dependencies or build tooling without a concrete feature need.
6. Preserve direct local-file startup and optional loopback serving.
7. Keep user-facing controls labelled; retain keyboard and numeric-edit alternatives.
8. Update examples and docs when behavior changes.
9. Run checks appropriate to the actual change; do not add tests that merely mirror trivial implementation details.
10. Keep generated files, dependencies, credentials, local caches and test artifacts out of release ZIPs and source control.
11. Never commit secrets. Maintain `.gitignore` when new tools create local files.
12. Use parallel agents only when explicitly requested or required by applicable project instructions; this file does not itself request delegation.

No native Office automation, browser installation, publication or remote account access is required for ordinary source work. Do not invent approval steps for routine authorized edits.

## 12. Validation commands

From the repository root:

### Syntax and core behavior

```sh
node --check src/app.js
node --check src/core.js
node --test tests/core.test.cjs
```

### Presentation round-trip

```sh
python -m pip install python-pptx
npm install --no-save pptxgenjs
python tests/export_roundtrip.py --js
```

Use `py` on Windows or `python3` on macOS/Linux when appropriate. Omit `--js` for Python-only verification.

### Browser interactions

```sh
npm install --no-save playwright pptxgenjs
npx playwright install chromium
node tests/browser.test.cjs
```

Optional packages are installed together here because some npm workflows prune previously installed no-save packages.

### Optional local server

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

### What to verify after changes

- Unit conversion and integer EMUs.
- Zoom-independent model geometry.
- Rotated bounds, corner resize and boundary behavior.
- Slide resize policies and rollback on invalid results.
- Layer order, hidden/locked objects and undo/redo.
- JSON round-trip and rejection of invalid imports.
- Generated text/source escaping and embedded-image handling.
- Slide dimensions and every element frame within 1 EMU after PPTX generation.
- Named binding examples: missing/duplicate/wrong-type slots, filename heading and independent image/text coordinates.

A geometry round-trip is not a visual rendering test. Inspect real Office output when typography or rendering is the subject of the change.

## 13. Known verification status from this conversation

The following passed during initial delivery:

- JavaScript syntax checks.
- Seven core Node test groups.
- Python and JavaScript PPTX generation and reopen checks.
- Slide and element geometry within 1 EMU.
- Rotation, off-slide placement, escaped/Unicode text and hidden-object exclusion checks.
- Static control-ID wiring and documentation link checks.
- ZIP integrity and `.gitignore` inclusion.

The detailed README's named-slot Python example was additionally executed with two image files. Each filename became the correct heading, and both heading/image frames matched the saved slot coordinates within 1 EMU.

**Still unverified:** full Playwright/browser interactions, visual comparisons in Microsoft PowerPoint, Safari/Firefox behavior and mobile usability. Chromium was unavailable and the browser download failed with an invalid/truncated archive. Do not reclassify supplied browser tests as passed without executing them successfully.

Verification environment used Node 24.19.0, Python 3.12.14 and python-pptx 1.0.2. These are observed test versions, not mandatory end-user editor dependencies.

Keep `docs/TESTING.md` honest and current. Report what ran, what passed and what was blocked.

## 14. Documentation and delivery requirements

Documentation should explain the user's workflow, not just implementation details.

Required topics:

- Extracting and opening the offline tool.
- Optional serving, including Windows/macOS/Linux command differences.
- Every control and its actual behavior.
- Coordinate origin, units, zoom invariance and rotation.
- Saving full projects versus coordinate-only exports.
- Python and JavaScript dependency installation and output paths.
- Named-slot mapping, filename-derived headings and updating existing Python objects.
- Aspect ratio, text wrapping, locked/hidden states and slide resizing.
- Limits, recovery failure modes and troubleshooting.
- Actual verification status.

Use Markdown tables for exact field mappings and comparisons. Use Mermaid or standalone SVG for coordinate/architecture diagrams. Do not use generated imagery for precise technical diagrams.

Make runnable examples executable as written and verify them when changed. Explain which objects exist already and which placeholders the user must create. Do not leave the crucial mapping hidden behind comments such as “insert your logic here.”

When packaging a release, include code, current README, `AGENTS.md`, docs/diagrams, examples, tests, `.gitignore` and license. Verify archive integrity and relative references. Exclude machine-specific runtime paths and temporary verification data.

## 15. Delivery continuity and next steps

Artifacts already delivered in this conversation:

- `Slide_Coordinate_Studio.zip`: original application source package with project docs, examples and tests.
- A separately delivered, expanded `README.md`: detailed control guide and extensive Section 13 mapping instructions.
- This `AGENTS.md`: project-wide agent instructions and continuity.

The expanded README and this file were created **after** the original ZIP. They are not automatically present in that previously delivered archive. Before preparing the next complete release, reconcile the expanded README into the repository root and include this file in the archive.

The complete named-slot mapping generator is currently documented as runnable Python in the expanded README; it was tested separately and is not part of the original ZIP's examples. If requested, promote it into a maintained example file with its binding tests.

Priorities for future work:

1. Run the supplied browser suite in an environment with a functioning Chromium installation.
2. Review generated slides in the user's intended Office environment.
3. Consolidate the latest documentation into a fresh release archive when requested.
4. Implement requested features with geometry/export parity and updated examples.

Features listed in `docs/ROADMAP.md` are proposals, not commitments or implemented functionality. Do not broaden the task to build them without a user request.
