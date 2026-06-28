# Research: Slide + fullscreen presentation

> Perplexity MCP · 2026-06-25

## Q1 — Landscape

**Запрос:** Slide fullscreen presentation for visual node editors 2024-2026

**Выжимка:**

- **Kumu Presentations:** slide = saved camera (pan/zoom) + map view + filters; fullscreen deck, Markdown in slides; эталон для graph tools.
- **Miro/Figma frames:** step-through frames as slides; per-frame zoom.
- **Reveal.js / MarkView / WLJS:** Markdown `---` splits, Mermaid diagrams, fullscreen `f`, **PDF export** — паттерн для export pipeline.
- **CAD viewports:** invisible layout viewport, per-viewport scale — аналог Slide без visible frame.

**Импликация:** Slide = `{ nodeIds, bounds, cameraState, presentationOrder, zoomPolicy }`; presenter animates camera between slides.

---

## Q2 — Fit (Membrana)

**Запрос:** fit with device-board, comment groups, tariff

**Выжимка:**

- **Не расширять boardGroup** — отдельный тип `boardSlide` или scenario-level `slides[]` без XYFlow parent-child visual.
- xyflow: programmatic `setViewport` + filter nodes by slide membership; clip in present mode.
- Comment groups = semantic labels; Slides = presentation order (можно auto-sync from profiles).
- Export: generate Markdown deck (slide title + mermaid subgraph or SVG snapshot) → Reveal or print-to-PDF; **tariff gate** on export action in cabinet.
- Fullscreen slides **only in edit mode** — aligns with author tool, not runtime MP7.

---

## Q3 — Risk

**Запрос:** risks presentation vs edit confusion, export gating

**Выжимка:**

| Риск | Митигация |
|------|-----------|
| Accidental edit in present | Present = **strict read-only**; Esc → edit |
| Stuck in present mode | Persistent mode indicator; segmented Edit/Present toggle |
| Overdense slides | maxNodes + minZoom readability; soft warning |
| Export gate backlash | Free: limited exports or watermark; show Pro label on export btn |
| Slide/group confusion | Docs: Group = visible story; Slide = invisible deck |

---

*Источник: Perplexity MCP*
