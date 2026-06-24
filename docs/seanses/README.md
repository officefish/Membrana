# docs/seanses — протоколы консилиумов и вечерний фидбек

Архив **коллективных обсуждений** виртуальной команды.

| Способ | Куда пишется |
|--------|----------------|
| `yarn consilium "<вопрос>"` | `docs/seanses/<slug>-<YYYY-MM-DD>.md` |
| `yarn consilium --save-as <slug> "…"` | `<slug>-<дата>.md` |
| `yarn team-evening-feedback` | `docs/seanses/team-evening-feedback-<YYYY-MM-DD>.md` |
| Вручную в Cursor | По [`CONSILIUM_PROMPT.md`](../prompts/CONSILIUM_PROMPT.md) или [`TEAM_EVENING_FEEDBACK.md`](../prompts/TEAM_EVENING_FEEDBACK.md) |

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

- Консилиум: [`docs/prompts/CONSILIUM_PROMPT.md`](../prompts/CONSILIUM_PROMPT.md) · `scripts/consilium.mjs`
- Team Evening Feedback: [`docs/prompts/TEAM_EVENING_FEEDBACK_REGULATION.md`](../prompts/TEAM_EVENING_FEEDBACK_REGULATION.md) · `scripts/team-evening-feedback.mjs`
- Роли: [`docs/VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md)
