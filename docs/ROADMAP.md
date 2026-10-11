# Future improvements

Version 1 concentrates on dependable frame geometry and reusable automation output. These are proposed extensions, not implemented features.

| Priority | Feature | Design consideration |
| --- | --- | --- |
| 1 | Browser-tested release and visual Office comparisons | Verify actual interactions and quantify text-rendering differences |
| 1 | More resize handles, rotation handle, distribution and smart guides | Preserve local coordinate math; keep snap threshold in screen pixels |
| 1 | Image contain/cover/crop | Store crop transform separately; implement parity in both exporters |
| 2 | Multiple slides and reference-image overlay | Slide IDs, per-slide state/history, schema migration; reference overlays excluded from output |
| 2 | Tables, charts, rich text and theme tokens | Distinguish editable Office objects from raster placeholders |
| 2 | Asset deduplication and IndexedDB recovery | Avoid huge JSON snapshots; define portable archive format and migrations |
| 2 | Groups, stable constraints and resize anchors | Group-local coordinate spaces, lock inheritance, proportional scaling policies |
| 3 | PPTX import | Preserve unsupported items as references; avoid claiming lossless round trips |
| 3 | Word/Excel adapters | Explicit page/paragraph/cell anchor choices; application-specific APIs |
| 3 | Office add-in or desktop wrapper | Version/requirement-set checks, distribution and native rendering |
| 3 | Multiple project tabs and collaboration | Project identities, conflict handling and concurrency-safe persistence |

For automatic text sizing, estimate overflow separately from stored frame geometry, then validate in the target renderer. Do not silently change positions to compensate for typography without a visible user choice.
