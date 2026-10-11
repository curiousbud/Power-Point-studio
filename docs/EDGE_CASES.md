# Edge cases and troubleshooting

This is a bounded version-1 implementation. No finite checklist can cover every browser, file or Office renderer; the table distinguishes implemented protections from limitations requiring review.

| Situation | Behavior / protection | Remaining limitation |
| --- | --- | --- |
| Screen zoom, monitor DPI, fit view | Model uses inches; viewport scale affects drawing only | 100% view is not physical ruler calibration |
| Empty/nonnumeric/NaN/infinite coordinates | Validation rejects and rolls back the edit | Number-entry formatting varies by browser/locale; exports use decimal dots |
| Zero or negative width/height | Rejected; pointer resize stops at minimum | Object flipping is not supported |
| Negative X/Y | Allowed with warnings | Output may extend beyond a slide |
| Rotated object crosses edge | Rotated geometric bounds trigger warning | Text outside its frame is not measured |
| Object larger than slide with Keep inside | Centres oversized axis; warns | A constraint cannot make it fit without resizing |
| Resize slide with different aspect ratio | Explicit keep, uniform-fit, stretch choices | Stretch distorts images/shapes; rotated angles are retained |
| Scale produces tiny text or invalid frame | Entire resize rolls back | Adjust element/font size before retrying |
| Partial multi-selection at boundary | Per-element Keep inside constraints | Relative spacing may change; disable constraint to preserve group delta |
| Overlapping objects | Front-to-back layer list and stacking commands | No marquee, persistent groups or collision avoidance |
| Hidden or locked objects | Select through Layers; unlock for edits | Global slide transforms and undo can change locked geometry |
| Text changes length | Fixed frame and zero margins; no automatic geometry changes | No reliable Office text overflow/autofit prediction |
| Fonts missing on target machine | Browser/Office fallback | Install the same fonts and inspect final PPTX; fonts are not embedded |
| Line breaks, quotes, backslashes, emoji | String serialization protects generated source | Bidirectional text, font glyphs and line breaking can differ in Office |
| Text containing HTML | DOM uses `textContent` | Content is shown literally, not interpreted as markup |
| Raster image missing from disk later | Images embedded in project and scripts | JSON/scripts become larger |
| Very large image | Upload <=10 MB; browser decode <=50 MP | Browser memory can be consumed during initial decode |
| Corrupt embedded image | UI import decode rejects, retains old project | Pure Node validator checks URI form, not image bytes; export library rejects bad bytes |
| SVG/GIF/WebP, remote image URL | Rejected deliberately | Convert to PNG/JPEG outside the tool; SVG import is not provided |
| Extreme aspect image | Initial fit and minimum frame sizes | Extremely thin images can be distorted at the minimum size |
| Huge layout | 500 objects; model/import cap 25 MB | Cap is an upper bound, not a performance promise on old hardware |
| Repeated images | Embedded each time | No deduplication or asset catalogue in v1 |
| Failed drag, Escape, pointer cancellation | Restores pre-gesture state for cancellation | Lost capture commits the current gesture; app/window termination may lose latest work |
| Clipboard denied or unavailable | Selects output for manual Ctrl/Cmd+C | Clipboard policies differ under local files and browsers |
| Storage denied/quota/full | Visible message; editor continues | Portable backup requires Save JSON |
| Project exceeds autosave budget | Autosave pauses, visible message | Last saved smaller recovery may remain; download JSON |
| Multiple tabs on same origin | Independent in-memory projects | Last local autosave writer wins; no coordination |
| File has wrong schema/version/duplicate IDs | Reject import atomically | No backwards/forwards schema migration yet |
| Project includes unknown fields | Normalizer discards them | Do not rely on preservation of custom metadata |
| Dependency install unavailable | Offline editor still works | PPTX generation dependencies must be installed separately |
| Existing output PPTX | Generated scripts save `layout.pptx` | Scripts can overwrite it; use a dedicated directory |
| Existing output script in CLI | Exclusive file write refuses overwrite | Choose a new filename |
| Linux or machine without Office | Editor and export libraries work independently | Final Office rendering still needs inspection in the intended viewer |
| Mobile / narrow screen / touch | Pointer input supported; panel overflow scrolls | Desktop-first design; no multi-touch zoom or mobile usability verification |
| Keyboard/screen reader | Labelled controls, Layers selection, numeric Inspector, status region | Canvas is not a full accessible object-navigation system |

## Common symptoms

**The image looks stretched.** The model uses a fixed width/height frame. Enable Preserve aspect and restore the correct ratio, or re-add the image. Export behavior matches stretching; it does not implement crop or letterboxing.

**PowerPoint text wraps differently.** Match the font installation and font size, then check the frame in Office. Zero margins reduce unexpected spacing but do not make browser and Office font metrics identical. Widen the frame or reduce font size after reviewing the final slide.

**Coordinates change after typing into the Inspector.** Display fields round to five decimals; committing them intentionally replaces the underlying value. For the most precise file coordinates, use full code export or EMU coordinate output.

**Coordinates copy but cannot be opened as a project.** Coordinate export is a simple array. Use Save JSON for a full, versioned project with content and styles.

**The JSON file does not open.** Check `version`, `unit`, the required element fields, supported dimensions and image format. The status message shows the failed validation. Never execute an unknown generated script merely to diagnose a layout.

**My layout is gone after restarting.** Browser-local recovery is not a portable file. Open your downloaded JSON backup. Separate project tabs and layouts larger than the autosave budget require explicit saves.

**The code cannot find `pptxgenjs` or `pptx`.** Install the matching dependency in the runtime running that script. Node resolves packages relative to the script's location; keep generated `.cjs` scripts inside the project or another folder with accessible `node_modules`.

**The UI does not load from a network drive or locked-down browser.** Copy the extracted folder locally or run the optional loopback-only static server. There is no server-side functionality to configure.
