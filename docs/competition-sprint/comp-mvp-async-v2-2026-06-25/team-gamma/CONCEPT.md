# Concept — Team Gamma (Rodchenko)

> **Phase 1 complete** · **Phase 2α in progress** · sprint `comp-mvp-async-v2-2026-06-25` · наследие v1: [Poster UserCase](../../comp-mvp-packaging-2026-06-21/team-gamma/CONCEPT.md)

## One-liner

**«Poster UserCase — async edition»** — плакат ①–⑥: шаг **⑤ async upload** и **⑥ detached report** как типографические блоки с минимум ink на main.

## Product thesis

Красота async = **negative space + numbered hierarchy**. Operator видит 6 шагов, не Promise topology. User functions прячут latent Sequence и StartAsyncJob; на main — лента из ≤7 элементов.

## Architecture

| Слой | Решение |
|------|---------|
| **id** | `usercase-mvp-microphone-gamma-async-v2` |
| **Visual** | Numbered groups ①…⑥, DESIGN.md palette |

```text
① Политики  ② Bootstrap  ③ Gate  ④ Trends  ⑤ Upload (async)  ⑥ Report (detached)
```

### Comment groups (≥4, target 6)

| # | id | title (RU) | color |
|---|-----|------------|-------|
| ① | `ucg-gamma-async-01-policy` | Политики | primary |
| ② | `ucg-gamma-async-02-bootstrap` | Подключение | neutral |
| ③ | `ucg-gamma-async-03-gate` | Окно записи | warning |
| ④ | `ucg-gamma-async-04-trends` | Классификация на gate | info |
| ⑤ | `ucg-gamma-async-05-upload` | Отправка в фоне | info |
| ⑥ | `ucg-gamma-async-06-report` | Отчёт дрон | success |

### User functions (1–2)

| id | name | Rationale |
|----|------|-----------|
| `fn-gamma-async-live-bundle` | Live + async bundle | gate + upload collapsed |
| `fn-gamma-async-policies` | Policy cards | optional poster row |

## Key decisions

| ID | Решение | Почему |
|----|---------|--------|
| GV-G1 | ⑤⑥ = отдельные poster rows | C7 Async clarity без tech jargon |
| GV-G2 | verb-first RU, 2 lines max | a11y + Rodchenko density |
| GV-G3 | Detached = success block, muted exec edges | «пришло позже» визуально |

## Trade-offs

| Плюс | Минус |
|------|-------|
| Мгновенный scan для нового оператора | Скрывает engineering detail |
| ⑥ шагов = полная async story | Больше groups чем v1 (5) |

## Phase 2 plan

### 2α

- Poster ①–④ + placeholder ⑤⑥ frames

### 2β

- Full collapse, F1–F7, demo ≤30s с async шагами

## Demo narrative

Плакат слева направо: «вот 6 шагов жизни поста» — на ⑤ показать chain-log async-start, на ⑥ — detached resolve.

---

## Implementation

### 2α — vertical slice

- [x] `yarn usercase:build-competition-async-v2 gamma`
- [x] poster ①–⑥ with async ⑤⑥ frames
- [x] verify-layout green

### 2β — full DoD

- [x] `fn-gamma-async-live-bundle` poster strip
- [x] `yarn usercase:verify-competition-async-v2` green
- [ ] F7 operator smoke

*Team Gamma · comp-mvp-async-v2-2026-06-25*
