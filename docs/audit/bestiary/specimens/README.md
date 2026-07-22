# specimens/ — хранилище бетий

Намеренные примеры плохого кода. Детектор класса **обязан** давать ≥1 finding
при наведении (`yarn bestiary:audit`, orphan-ruleset).

| Правило | |
|---------|--|
| Layout | `specimens/<defectClass>/*.mjs` |
| Пометка | первая строка: `// specimen: <defectClass>` |
| Аудит | `yarn bestiary:audit` → `registry/BESTIARY_LIST.md` |
| Weekly | `yarn bestiary:weekly` → `analysis/bestiary-run-YYYY-MM-DD.md` |
| Запрет | «лечебный» код без пометки; автофикс прод (#533) |

## Текущие бетии (B2 + B3)

| Class | Файл |
|-------|------|
| `silent` | `silent/swallow.mjs` — пустой `catch {}` |
| `unwired` | `unwired/orphan-export.mjs` — export без потребителей |
| `ornament` | `ornament/unread-write.mjs` — write без читателей |
| `jargon-out` | `jargon-out/external-jargon.mjs` — MAIN_DAY_ISSUE + perplexity |
| `echo` | `echo/triple-reflection.mjs` — один origin ×3 без dedupeByOrigin |

`goal-displacement` — нет specimen (явный defer B3; follow-up `bc-followup-goal-displacement`).
