# Concept — Team Gamma (Rodchenko)

## One-liner

**«Poster UserCase»** — canvas как **одностраничный плакат**: нумерованные шаги ①–⑤, цветовая иерархия DESIGN.md, **минимум ink** — operator видит продукт, не graph editor.

## Product thesis

Красота = **visual hierarchy + negative space**. Comment groups — не «технические зоны», а **типографические блоки** с коротким RU copy. User functions прячут complexity; на main остаётся **читаемая лента из 5–7 элементов**, как UI mockup, не схема.

Rodchenko: frame colors из preset palette (`primary`, `warning`, `success`, `info`) **строго по DESIGN.md**; descriptions — **2 строки max**, verb-first («Записать 5 s», «Классифицировать FFT», «Отправить отчёт»).

## Architecture

| Слой | Решение |
|------|---------|
| **id** | `usercase-mvp-microphone-gamma` |
| **Visual system** | Numbered groups ①…⑤ + icon-less text (a11y: title sufficient) |
| **Density** | Target: **≤7 nodes visible on main** after collapse |

```text
┌─ ① Политики ─────────────────────────────────────────┐
│  [fn-gamma-policies]                                    │
└─────────────────────────────────────────────────────────┘
        ↓ exec
┌─ ② Захват ── ③ Анализ ── ④ Публикация ────────────────┐
│  single function strip OR 3 micro-groups               │
└─────────────────────────────────────────────────────────┘
```

### User functions (1–2, visual-first)

| id | name | Rationale |
|----|------|-----------|
| `fn-gamma-live-bundle` | Live observation bundle | Entire gate+trends+journal inside one frame |
| `fn-gamma-policies` *(optional)* | Policy cards | Separated only if poster needs «card row» look |

Prefer **1 mega-function** for minimal main ink; policies as **comment-only frame** without collapse if readable.

### Comment groups (5) — poster rows

| # | id | title | description (RU) | color |
|---|-----|-------|------------------|-------|
| ① | `ucg-gamma-01-policy` | Политики записи и FFT | Задают длительность окна и шаблоны trends | primary |
| ② | `ucg-gamma-02-gate` | Окно записи | 5 s WAV при заполнении буфера | warning |
| ③ | `ucg-gamma-03-fft` | Спектр и накопление | Кадры FFT для классификации | info |
| ④ | `ucg-gamma-04-trends` | Классификация | DRONE_TIGHT и каталог шаблонов | info |
| ⑤ | `ucg-gamma-05-journal` | Отчёт на сервер | Track + trends-fft/v0.1 | success |

initial/onConnect: **1 group each**, muted neutral frame — «Подготовка».

## Key decisions

| ID | Решение | Альтернатива | Почему |
|----|---------|--------------|--------|
| G1 | Poster metaphor (numbered steps) | LR engineering zones | 30-sec explainability |
| G2 | 1 mega-function on main | Beta-style 3 functions | Min visual noise |
| G3 | Large group rects + padding | Tight MVP frames | Whitespace = clarity |
| G4 | Smart align «Авто» per row after edit | Manual drag only | Grid discipline |

## Trade-offs

| Плюс | Минус |
|------|-------|
| Wins C4 UX / visual on vote | Mega-function harder to maintain |
| Strong DESIGN.md alignment | verify-layout overlap risk if rects too big |
| Best screenshot for docs | F2–F4 debug inside collapse |

## Implementation (Phase 2β)

| Metric | Value |
|--------|-------|
| UserCase id | `usercase-mvp-microphone-gamma` |
| Functions | 2 (`fn-gamma-recording-gate`, `fn-gamma-trends-publish`) |
| Comment groups | 5 poster + onConnect/initial «Подготовка» |
| verify-layout | green |
| Mega-bundle | deferred (D-PINS-9) |

Commit: `e507a2e`

## Phase 2α — DONE (2026-06-21)

- `usercase-mvp-microphone-gamma` — poster groups ①–⑤ + 2 functions (gate + trends publish; mega-bundle deferred — D-PINS-9)
- `verify-layout` green

## Phase 2β — next

- Fork MVP; redraw commentGroups rects (editorial pass)
- Numbered titles; collapse gate+trends to `fn-gamma-live-bundle`
- Screenshot-quality main layout; demo F1–F4 one Run

### 2β

- Polish initial/onConnect groups; exec layout + align
- verify-layout; optional `apps/docs` screenshot in team folder
- Side-by-side PNG: MVP vs gamma poster

## Risks

| Risk | Mitigation |
|------|------------|
| Mega-function pin soup | Limit data pins ≤9; document in CONCEPT |
| Groups hide nodes incorrectly | nodeIds audit after layout canon |

## Demo narrative

1. «Смотрите **плакат**: шаг ① политики, ② запись, … ⑤ journal — без прокрутки mental model.»
2. «Double-click function — детали для инженера; operator не обязан.»
3. «30 секунд — новый оператор понимает продукт.»

---

*Team Gamma · Phase 1 · comp-mvp-packaging-2026-06-21*
