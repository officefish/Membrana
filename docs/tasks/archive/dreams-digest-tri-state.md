# Архив: Дайджест снов не различает «не запускалось»/«пусто»

| Поле | Значение |
|------|----------|
| **ID** | `dreams-digest-tri-state` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-23 |
| **Архивирована** | 2026-07-29 |
| **GitHub Issue** | #998 |
| **Linear** | DRU-362 |
| **Промпт** | [`docs/prompts/FRAME_RAILS_2307_PROMPT.md`](../../prompts/FRAME_RAILS_2307_PROMPT.md) |

## Заметки при закрытии

stale card: dreams digest tri-state уже реализован в текущем HEAD; evidence: git merge-base confirms 06043502 is ancestor; scripts/lib/dreams-format.mjs renders three statuses has-winners/ran-empty/never-ran; scripts/lib/dreams-log.mjs classifyDreamDigestState distinguishes missing volume/log/empty log from ran-empty; node --test scripts/dreams-format.test.mjs scripts/dreams-providers.test.mjs scripts/dreams-log.test.mjs scripts/dreams-tick.test.mjs = 16/16; Linear live media snapshot 2026-07-29T15:45:01.996Z pullOk=true recordCount=300 found DRU-362 state=Done stateType=completed githubIssueRefs=[998] completedAt=2026-07-23T11:30:53.524Z

## Отчёт о проверке

Карточка закрыта как устаревшая: реализация уже присутствовала в текущем HEAD,
новая кодовая правка не потребовалась.

**Доказательства в коде.**

- `git merge-base --is-ancestor 06043502 HEAD` → `ancestor=yes`.
- `scripts/lib/dreams-format.mjs` рендерит три статуса:
  `has-winners`, `ran-empty`, `never-ran`.
- `scripts/lib/dreams-log.mjs` `classifyDreamDigestState` отличает отсутствующий
  том, отсутствующий лог, пустой лог и честное `ran-empty`.

**Проверки.**

- `node --test scripts/dreams-format.test.mjs scripts/dreams-providers.test.mjs scripts/dreams-log.test.mjs scripts/dreams-tick.test.mjs`
  → 16/16 pass.

**Linear.**

Live snapshot через media:

- `format=linear-snapshot@1`, `producedBy=media-NL`;
- `pullOk=true`;
- `capturedAt=2026-07-29T15:45:01.996Z`;
- `recordCount=300`;
- найден `DRU-362`: `state=Done`, `stateType=completed`,
  `githubIssueRefs=[998]`, `completedAt=2026-07-23T11:30:53.524Z`.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
