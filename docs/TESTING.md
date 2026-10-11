# Testing and delivery verification

## Executed successfully

Environment: Node 24.19.0, Python 3.12.14, python-pptx 1.0.2, with PptxGenJS supplied by the execution environment.

1. JavaScript syntax checks for editor and core.
2. Seven Node test groups in `tests/core.test.cjs`: unit conversions and integer EMUs; rotated bounds and constraints; oversized-object behavior; all slide resize policies; malformed and unsafe input validation; visible/hidden code export; model immutability during extraction.
3. `tests/export_roundtrip.py --js`: generated Python and JavaScript presentations reopened with python-pptx. Exact slide dimensions and every element frame compared within 1 EMU. Text content, rotation, off-slide positioning, hidden-element exclusion and embedded-image shape presence verified, including quoted text, backslashes and emoji.

Round-trip validation verifies file geometry and content; it is not a visual rendering comparison in Microsoft PowerPoint.

## Supplied but not executed successfully

`tests/browser.test.cjs` checks direct file opening, text edits, zoom invariance, unit display, rotated dragging, undo, locks, duplicate, invalid edits, slide sizing, save downloads, rejected imports and literal HTML text rendering.

Chromium was not installed in the delivery environment. Attempting the Playwright browser download failed with an invalid/truncated archive. Therefore browser integration checks did not execute. No Chromium/Firefox/Safari visual or interaction certification is claimed.

## Run locally

```sh
node --test tests/core.test.cjs
npm install --no-save playwright
npx playwright install chromium
node tests/browser.test.cjs
python -m pip install python-pptx
npm install --no-save pptxgenjs
python tests/export_roundtrip.py --js
```

Install optional packages together (`npm install --no-save playwright pptxgenjs`) if your npm installation prunes packages from earlier no-save commands.

## Recommended acceptance review

Before relying on the tool for production decks, run the browser tests and review a generated slide in the actual Office version used for delivery. Manually check:

- Dragging and rotated corner resizing at fit/50%/200%; pointer cancel and Escape.
- Large images, 25 MB import rejection and browser-storage denial.
- Browser zoom 80%/125% and a second monitor with different display scaling.
- Multi-selection, individual boundary constraints and layered/hidden/locked elements.
- Both clipboard success and manual fallback.
- Typography in installed fonts, long text, emoji and right-to-left content.
- Safari/Firefox local-file handling, accessible keyboard use and narrow screens.

These review items are deliberately not marked as passed by the delivery checks.
