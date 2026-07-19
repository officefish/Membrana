# Протокол C6 — единый agent workflow и enforcement

| Поле | Значение |
|---|---|
| Дата | 2026-07-19 |
| Режим | Ручной председательский resolution по прямому разрешению владельца |
| Причина | Anthropic недоступен; владелец разрешил продолжить собственным анализом |
| Предшественники | C5, C7 — PASS |
| Аудитор | Отдельный read-only агент |
| Итог | `C6_VERDICT.md` — PASS |

## Ход решения

1. Проинвентаризированы production skills/CLI на Cursor, Claude, Codex и OpenCode.
2. Выбран один canonical owner `.cursor/skills` и четыре узких skill, включая новый
   `membrana-insight-lifecycle`.
3. Разделены decision, transcription, task closure candidates, reconciliation и V.
4. Exact CLI, authority, idempotency, failure codes, overview/top-3 и hooks получили
   несколько repair-раундов по independent audit.
5. Final audit подтвердил C1–C5/C7 fidelity и testable implementation boundary: PASS.

Канонический результат находится только в
`docs/meeting/insight-archive-lifecycle/C6_VERDICT.md`; этот протокол не добавляет решений.

