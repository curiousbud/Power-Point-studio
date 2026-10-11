# User guide

## Canvas and slide sizing

Choose a preset, then click **Apply slide size**. Presets set pending width/height values; the application applies them only when you click the button. Custom dimensions use the current display unit. This editor supports 1–56 inches per dimension. Changing units or another layout control refreshes the size fields from the actual slide, so apply pending dimensions before making another change.

Resize behavior:

| Mode | Position | Element size | Font size |
| --- | --- | --- | --- |
| Keep element dimensions | Unchanged | Unchanged | Unchanged |
| Scale uniformly & centre | Uniformly scales and adds centred offset | Same scale on both axes | Same scale |
| Stretch layout to fit | Independent X/Y scaling | Independent width/height scaling | Smaller axis scale |

Keep mode may place objects outside the new slide. Warnings report this. Resizing the entire slide also resizes locked elements in scale/fit mode; locks prevent direct element edits, not project-level transforms. A resize that produces unsupported dimensions or font sizes is rejected atomically, retaining the original project.

## Elements

Add Text, Rectangle, Ellipse or Image. A new element starts near the top-left and is selected immediately. Shapes have a solid fill and no outline. Text is plain text; use the Inspector textarea for line breaks. Font family is a literal family name such as `Arial` or `Calibri`, not a list of families.

PNG/JPEG uploads are embedded into JSON and generated scripts. To preserve image proportions, enable **Preserve aspect when resizing**. Otherwise resize/export deliberately stretches the image to its frame. Imported images initially fit a bounded area, but an exceptionally thin image may hit the minimum size limit. Image crop, opacity, outlines and contain/cover modes are not implemented.

Click an object to select it. Shift-click toggles objects in the selection. The layer list lets you select objects behind others and hidden objects. Its top entry is the frontmost object.

Dragging a multi-selection preserves relative positions when Keep inside is off. Snapping is based on the first editable object's unrotated X/Y, so the same delta applies to the entire selection. With Keep inside on, each object is constrained independently and relative spacing can change near boundaries.

## Exact editing and rotation

X and Y locate the unrotated frame. Width and height must be at least 0.01 inches and at most 112 inches. Position is limited to ±112 inches. Negative coordinates are allowed when Keep inside is off. Rotation supports −360 to +360 degrees.

Rotation is clockwise in the screen's downwards Y-axis system. The frame's centre stays fixed when changing rotation. Corner handles convert pointer movement into the element's local rotated axes; they do not treat a rotated bounding box as the frame.

If aspect preservation is on, changing width changes height and vice versa. Hold Shift during a pointer resize to preserve aspect temporarily. Corner dragging never flips an object; it stops at the minimum size. Numeric inputs validate on change/blur; invalid edits show a status message and retain the prior valid state.

Display values use up to five decimal places; the model retains full JavaScript double precision until you explicitly edit a displayed number. Copy JSON uses six decimal places (or integer EMUs). Full Python/JavaScript exports use the model's stored numbers.

## Arrange

For one editable object, alignment targets the slide. For multiple editable objects, alignment targets their combined rotated visible bounds. Locked objects are excluded from alignment and movement. A hidden object can be selected in Layers and edited; it is not drawn or emitted in Python/JavaScript exports.

**To front / To back** preserve relative order within a selected set. Duplicate makes new IDs and offsets copies by 0.2 inches. Locked objects are not duplicated or deleted. Unlock them in the Inspector first.

There is no distribution command, persistent group, selection marquee or keyboard focus cycle between individual canvas objects in this version. Use Layers to select and Inspector to move objects without a pointer.

## Save, recover and copy

**Save JSON** downloads the entire editable project, including hidden/locked objects and embedded images. It is the portable backup. **Open JSON** validates the version, units, fields, dimensions and embedded images before replacement. Invalid imports retain the previous project. Opening a file or clearing the canvas can be undone while history is still available.

Autosave uses a browser-local key. It is best-effort, may be unavailable under `file://` or private browsing, and pauses when JSON exceeds roughly 4 million characters. A previous smaller autosave may remain. There is one shared autosave slot per browser origin; multiple tabs overwrite it with last-writer-wins behavior. Use separate JSON downloads for independent projects.

History is at most 50 snapshots, with a 20-million-character retention budget. A single large snapshot can exceed that budget. History is not saved across sessions. Browser storage cleanup or moving the folder may affect recovery. An unload warning appears after edits, but browsers may suppress it, especially on mobile. Do not use autosave as your only backup.

Copying may be denied outside a secure context. The output is then selected; press Ctrl+C or Cmd+C. The editor never claims a clipboard write succeeded when it did not.

Python and JavaScript selected exports include imports and slide setup, creating a self-contained presentation of the selected **visible** objects. For use in an existing script, copy the relevant element statements and use your own `slide`. VBA output only assigns coordinates to an existing `shp` variable; it does not create shapes or define slide size. Coordinate JSON can include hidden objects for your own use.

## Shortcuts

Shortcuts are ignored while editing an input, textarea or select.

| Shortcut | Action |
| --- | --- |
| Arrow keys | Move selected editable objects by 1 point |
| Shift + arrow | Move by 10 points |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z; Ctrl/Cmd + Y | Redo |
| Ctrl/Cmd + S | Save JSON |
| Ctrl/Cmd + D | Duplicate editable selection |
| Ctrl/Cmd + A | Select all visible objects |
| Delete / Backspace | Delete editable selection |
| Escape | Cancel active drag, clear selection |
| Shift-click | Toggle selection membership |

Snap affects pointer operations, not numeric editing or keyboard nudges. Grid spacing is always entered in inches, even when other controls display centimetres/points.
