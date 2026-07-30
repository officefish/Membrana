# Архив: Резак секретов: redactSecrets на существующих детекторах — веха secret-parser-built

| Поле | Значение |
|------|----------|
| **ID** | `secret-cutter` |
| **Статус** | archived |
| **Размер** | L |
| **Создана** | 2026-07-26 |
| **Архивирована** | 2026-07-29 |
| **GitHub Issue** | #1240 |
| **Linear** | DRU-473 |
| **Промпт** | [`docs/prompts/SECRET_CUTTER_PROMPT.md`](../../prompts/SECRET_CUTTER_PROMPT.md) |

## Заметки при закрытии

stale card: secret-cutter уже реализован в дереве; evidence: scripts/lib/secret-redact.mjs экспортирует redactSecrets/redactJsonSensitiveValues/formatRotationManifest, scripts/secret-redact.mjs даёт CLI без in-place записи; node --test scripts/secret-redact.test.mjs = 18/18; Linear live media snapshot 2026-07-29T15:25:21.670Z pullOk=true recordCount=298 found DRU-473 state=Done stateType=completed githubIssueRefs=[1240] completedAt=2026-07-26T11:54:13.648Z; registry linearId repaired to DRU-473

## Отчёт о проверке

Карточка закрыта как устаревшая: реализация уже присутствовала в дереве, новая
кодовая правка не потребовалась.

**Доказательства в коде.**

- `scripts/lib/secret-redact.mjs` экспортирует `redactSecrets`,
  `redactJsonSensitiveValues`, `formatRotationManifest`.
- `scripts/secret-redact.mjs` даёт CLI `secret:redact` и запрещает in-place запись:
  очищенная копия пишется отдельно, вход не перезаписывается.
- Реализация переиспользует правила существующего secret-scan вместо нового набора
  паттернов.

**Проверки.**

- `node --test scripts/secret-redact.test.mjs` → 18/18 pass.

**Linear.**

Live snapshot через media:

- `format=linear-snapshot@1`, `producedBy=media-NL`;
- `pullOk=true`;
- `capturedAt=2026-07-29T15:25:21.670Z`;
- `recordCount=298`;
- найден `DRU-473`: `state=Done`, `stateType=completed`,
  `githubIssueRefs=[1240]`, `completedAt=2026-07-26T11:54:13.648Z`.

`linearId` в реестре исправлен на `DRU-473` перед архивом.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
