# Архив: Мастерская задач: три глагола объявлены без движков — строить или объявить declared-not-built

| Поле | Значение |
|------|----------|
| **ID** | `tw-declared-verbs-honest-no` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-26 |
| **Архивирована** | 2026-08-11 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/TW_DECLARED_VERBS_HONEST_NO_PROMPT.md`](../../docs/prompts/TW_DECLARED_VERBS_HONEST_NO_PROMPT.md) |

## Заметки при закрытии

Закрыто PR #1859 (6cd624a4) по слову владельца 11.08 «честное нет»: три глагола мастерской задач сняты как род declined, не как молчание. Пять мест: package.json (строки сняты), workshop.manifest.json (форма declined вместо null — null значит «глагол не свойственен»), workshop.catalog.json (записи остаются с state=declined без движка — пустой каталог читается как приглашение завести заново), dead-wire-pending.json (три записи вынесены), новый docs/tasks/declined-verbs.json (реестр снятых: кто/когда/почему/условие переоткрытия, основания проверяемыми маркерами по B4 из ревью). Валидатор описи выучил род declined (4 зуба), зубы dead-wire отвязаны от пришпиленных чисел. Follow-up на ложные missing прибора — #1862.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
