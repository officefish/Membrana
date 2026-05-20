# docs/seanses — протоколы консилиумов

Архив **коллективных обсуждений** виртуальной команды (все пять ролей, консенсус, ≥20 реплик).

| Способ | Куда пишется |
|--------|----------------|
| `yarn consilium "<вопрос>"` | `docs/seanses/<slug>-<YYYY-MM-DD>.md` |
| `yarn consilium --save-as <slug> "…"` | `<slug>-<дата>.md` |
| Вручную в Cursor | По [`CONSILIUM_PROMPT.md`](../prompts/CONSILIUM_PROMPT.md), затем сохранить сюда |

MCP-серверы не заменяют консилиум; протокол остаётся в этом каталоге — см. [`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md).

## Соглашение по именам

| Источник | Имя файла |
|----------|-----------|
| вопрос из CLI | `<slug-вопроса>-2026-05-15.md` |
| `--save-as brandbook` | `brandbook-2026-05-15.md` |
| повтор в тот же день | перезаписывает файл с той же датой (используй `--save-as` для отдельных веток) |

## Отличие от `docs/discussions/`

| | `discussions/` | `seanses/` |
|---|----------------|------------|
| Кто говорит | один персонаж (`yarn ask`) | все пять ролей |
| Формат | Q&A блоки, append | полный протокол сеанса |
| Решение | совет, не обязателен | **итоговое решение консилиума** |

## Ссылки

- Промпт и правила: [`docs/prompts/CONSILIUM_PROMPT.md`](../prompts/CONSILIUM_PROMPT.md)
- Роли: [`docs/VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md)
- Скрипт: `scripts/consilium.mjs`
