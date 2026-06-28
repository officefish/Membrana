# INSIGHT: Объект «Слайд» и fullscreen-режим презентации сценария

| Поле | Значение |
|------|----------|
| **ID** | `insight-slide-fullscreen-presentation` |
| **Статус** | adopted |
| **Источник** | user |
| **Создан** | 2026-06-25 |

---

## Проблема / наблюдение

Device-board canvas (32+ узлов на main) перегружен для **демо, обучения и review** с нетехническими stakeholders. Comment groups (`boardGroup`) дают **видимые рамки** и семантику Act I/II — это продуктовая история, но не **презентационный формат**. Нет способа пройти сценарий как deck слайдов с контролируемым масштабом.

## Гипотеза

Ввести объект **Slide** — логическая группировка, **похожая на group**, но **без видимых изменений** на canvas в обычном edit mode:

- Slide определяет **разметку viewport**: какие блоки/узлы входят в слайд и как они **выглядят** на этом кадре (camera bounds, zoom policy).
- Slide **не рисует рамку** (в отличие от comment group) — только metadata + layout contract.
- Режим **Fullscreen Slides** — презентация всего сценария: перелистывание слайдов с block-схемами, zoom per slide.

### Slide vs Comment Group

| | Comment Group | Slide |
|---|---------------|-------|
| Визуал на canvas | Рамка, title, frameColor | **Нет** (invisible viewport) |
| Назначение | Семантика / operator journey | **Презентация / layout кадра** |
| Runtime | Нет | Нет (view-only) |
| Export | — | .md / .pdf (paid tariff) |

### Zoom и лимиты

- На слайде узлы могут быть **крупнее/мельче** в зависимости от количества (auto-fit zoom).
- **Ограничения:** max nodes per slide, min/max zoom (readability floor).
- При превышении — soft warning в edit mode; hard cap опционально.

### Доступность и тарифы

| Возможность | Кто |
|-------------|-----|
| Fullscreen Slides (просмотр, листание) | **Только edit mode** (не view-only runtime) |
| Export слайдов `.md` / `.pdf` | **Платные тарифы** (cabinet tariff gate) |

View-only runtime сценария **не** показывает slide deck — это инструмент автора/оператора при редактировании.

## Scope (черновик)

**In scope:**

- Модель `ScenarioSlide` в `@membrana/core` + device-board UI
- Fullscreen presenter: keyboard ←/→, fit-to-slide, clip/dim non-members
- Zoom policy + node count limits
- Export pipeline (md: mermaid/snapshot per slide; pdf: render deck)
- Tariff gate для export (free: preview only или N exports)

**Out of scope (v0 insight):**

- Autoplay kiosk / public URL (как Kumu)
- Slide mode в cabinet remote runtime
- Замена comment groups

## Связи

- `packages/device-board/src/graph/comment-group.ts` — contrast, не merge типов
- `insight-async-v2-product-narrative` — slides могут map на Act I/II/IIb frames
- `insight-agent-scenario-builder` — Usability first → auto-generate slides from journey
- `docs/MEMBRANE_PLATFORM.md` — tariff enforcement для export
- `usercase-comment-group-profiles.ts` — optional sync slide order ↔ comment groups

## Оператор / автор видит

1. Edit mode: создать Slide from selection; reorder в sidebar; faint dashed bounds только при select.
2. Кнопка «Present slides» → fullscreen, read-only, ←/→.
3. Export (Pro): `.md` deck или `.pdf`; free — upsell at export.

## Вопросы для research (Q1–Q3)

1. **Landscape:** slide/viewport presentation in node editors, Kumu, Miro frames, Reveal.js export
2. **Fit:** invisible viewport vs boardGroup; xyflow camera; Membrana tariff export gate
3. **Risk:** edit vs present mode confusion; node density; export freemium backlash
