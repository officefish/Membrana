# Архив: Вечерний фидбек команды через резолвер каналов процедур

| Поле | Значение |
|------|----------|
| **ID** | `tef-channel-resolver` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-26 |
| **Архивирована** | 2026-07-29 |
| **GitHub Issue** | #1210 |
| **Linear** | DRU-460 |
| **Промпт** | [`docs/prompts/TEF_CHANNEL_RESOLVER_PROMPT.md`](../../prompts/TEF_CHANNEL_RESOLVER_PROMPT.md) |

## Заметки при закрытии

stale card: TEF channel resolver уже реализован в текущем HEAD; evidence: git merge-base confirms f2d8c1a6 is ancestor; scripts/lib/llm-procedures.json registers team-evening-feedback; scripts/lib/team-evening-feedback-ritual.mjs invokes EVENING_FEEDBACK_PROCEDURE_ID via injected procedure channel, logs attempts, writes provider/model/source provenance, refuses exhausted/empty body without writing protocol; node --test scripts/team-evening-feedback-ritual.test.mjs scripts/llm-procedure-channels.test.mjs = 25/25; Linear live media snapshot 2026-07-29T15:41:48.456Z pullOk=true recordCount=300 found DRU-460 state=Done stateType=completed githubIssueRefs=[1210] completedAt=2026-07-26T07:58:57.748Z; registry linearId repaired to DRU-460

## Отчёт о проверке

Карточка закрыта как устаревшая: реализация уже присутствовала в текущем HEAD,
новая кодовая правка не потребовалась.

**Доказательства в коде.**

- `git merge-base --is-ancestor f2d8c1a6 HEAD` → `ancestor=yes`.
- `scripts/lib/llm-procedures.json` содержит процедуру `team-evening-feedback`.
- `scripts/lib/team-evening-feedback-ritual.mjs` вызывает
  `EVENING_FEEDBACK_PROCEDURE_ID` через резолвер procedure channels.
- При попытках логируются provider/model; в протокол пишется провенанс
  `llmProvider`, `llmModel`, `llmSource`.
- При исчерпанной цепочке или пустом теле протокол не пишется.

**Проверки.**

- `node --test scripts/team-evening-feedback-ritual.test.mjs scripts/llm-procedure-channels.test.mjs`
  → 25/25 pass.

**Linear.**

Live snapshot через media:

- `format=linear-snapshot@1`, `producedBy=media-NL`;
- `pullOk=true`;
- `capturedAt=2026-07-29T15:41:48.456Z`;
- `recordCount=300`;
- найден `DRU-460`: `state=Done`, `stateType=completed`,
  `githubIssueRefs=[1210]`, `completedAt=2026-07-26T07:58:57.748Z`.

`linearId` в реестре исправлен на `DRU-460` перед архивом.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
