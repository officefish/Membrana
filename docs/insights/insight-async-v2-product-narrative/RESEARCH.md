# Research: Async v2 product narrative

> Perplexity MCP · 2026-06-25

## Q1 — Landscape

**Запрос:** Async v2 topology как продуктовая история: industry landscape 2024-2026

**Выжимка:**

- Async side-effects UX: показывать **commanded / pending / committed** state одновременно, не блокировать UI.
- Паттерны: comment frames (локальное «почему ждём»), journey/timeline lanes (этапы), policy strips (правила задержки), chain-log markers (execution trace).
- n8n/xyflow: node badges «waiting/running/done», side panel execution order.
- Принцип: **не прятать async внутри кнопки** — отдельный visibility layer.

**Импликация:** Act IIb upload + detached drone = journey «trigger → queued → report later» + badges на узлах.

---

## Q2 — Fit (Membrana)

**Запрос:** fit with Membrana device-board comment frames + DaisyUI

**Выжимка:**

- Уже есть `usercase-comment-group-profiles.ts`, comment groups на canvas.
- GATE copy + chain-log маркеры в `logs:parse` summary — low-code путь без новых node kinds.
- Alpha fork = operator journey narrative; Beta = policy strip; Gamma — минимальные badges.
- Scorecard C7 «Async clarity» — критерий приёмки.

---

## Q3 — Risk

**Запрос:** risks over-labeling engineer canvas vs product story

**Выжимка:**

| Риск | Митигация |
|------|-----------|
| Over-labeling | Comment groups collapsible; operator mode vs engineer mode |
| Canvas clutter | Frames только на competition forks, не default MVP |
| Copy drift | Один source в COMPETITION_V1_DESIGN_SYNTHESIS |

---

*Источник: Perplexity MCP*
