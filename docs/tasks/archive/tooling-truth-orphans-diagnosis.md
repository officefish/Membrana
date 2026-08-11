# Архив: Приборы говорят о себе замеренное: диагноз scripts:orphans и прецедент предела ревью

| Поле | Значение |
|------|----------|
| **ID** | `tooling-truth-orphans-diagnosis` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-08-02 |
| **Архивирована** | 2026-08-11 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/TOOLING_TRUTH_ORPHANS_DIAGNOSIS_PROMPT.md`](../../docs/prompts/TOOLING_TRUTH_ORPHANS_DIAGNOSIS_PROMPT.md) |

## Заметки при закрытии

Сделано в PR #1642 (4388f415, 02.08): scripts:orphans доносит замеренную причину — verdicts[{path,reason}] и сводка byReason, diagnosisLine/reportLines вынуты из main и покрыты зубами, предупреждение о нулевых правилах печатается только при непустом no_rule (живой прогон: 51 из 1002, все subject_unresolved). Прецедент tooling-gap записан: docs/precedents/2026-08-02-review-blindness-scales-with-diff.md.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
