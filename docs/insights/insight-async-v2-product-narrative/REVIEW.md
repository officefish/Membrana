# Review: Async v2 product narrative

> Virtual team · 2026-06-25

[Teamlead]: C7 async clarity — слабое место scorecard packaging. Техника верна (latent Sequence, detached drone), оператор не видит историю. **Adopted** как docs+UX эпик, не блокер CI. После smoke gate (G).

[Структурщик]: Без новых node kinds — comment frames + `logs:parse` operator summary. `usercase-comment-group-profiles` расширить для Act IIb labels. Не трогать collapsed function internals.

[Математик]: Chain-log маркеры — формальный контракт: `async.upload.started`, `async.upload.done`, `drone.report.latent`. Уже частично в lessons; закрепить в parse schema.

[Музыкант]: Оператор должен понимать: «звук записан, upload в фоне, drone report придёт позже». Journey map в comment frame на mic→upload path — приоритет.

[Верстальщик]: Policy strip (Beta) — DaisyUI alert/badge на device-board chrome, не на canvas nodes. Comment frames — typography из DESIGN.md, collapsible groups.

## Голосование приоритета (1–10)

| Роль | Внедрять | Этап | /10 |
|------|----------|------|-----|
| Teamlead | да | месяц | 7 |
| Структурщик | да | месяц | 6 |
| Математик | частично | месяц | 5 |
| Музыкант | да | месяц | 7 |
| Верстальщик | да | месяц | 8 |

**Средний балл:** 6.6

## Резюме Teamlead

- Рекомендуемый статус: **adopted**
- Влияние на plan:week: weight **6.6**
- Следующий шаг: обновить Alpha/Beta comment profiles + operator summary в `logs:parse` для async markers
