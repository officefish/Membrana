# Insight: Async v2 product narrative

| Поле | Значение |
|------|----------|
| **ID** | `insight-async-v2-product-narrative` |
| **Статус** | adopted |
| **Источник** | packaging-epic |
| **Создан** | 2026-06-25 |

---

## Проблема / наблюдение

Canvas async-v2 технически верен (latent Sequence, detached drone), но оператор не видит **продуктовую историю** Act IIb: upload не блокирует gate, drone report приходит позже.

## Гипотеза

Comment frames + operator journey (Alpha) или policy strip (Beta) + явные chain-log маркеры сделают async topology понятной без раскрытия collapsed functions.

## Scope

- In scope: comment groups, GATE copy, logs-parse summary для оператора
- Out of scope: новые node kinds, merge winner fork в default MVP

## Связи

- `COMPETITION_V1_DESIGN_SYNTHESIS.md` § async
- `usercase-comment-group-profiles.ts`
- Scorecard C7 Async clarity

## Вопросы для research

1. **Landscape:** how DAW / node editors explain async side-effects to users
2. **Fit:** Membrana device-board comment frames + DaisyUI patterns
3. **Risk:** over-labeling engineer canvas vs product story
