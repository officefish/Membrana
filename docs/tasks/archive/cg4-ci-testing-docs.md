# Архив: CG4: CONTRIBUTING § CI & Testing — таблица smoke vs full, классификация тестов

| Поле | Значение |
|------|----------|
| **ID** | `cg4-ci-testing-docs` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-02 |
| **Архивирована** | 2026-08-10 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/CI_GATE_STABILIZATION_SPRINT_PROMPT.md`](../../docs/prompts/CI_GATE_STABILIZATION_SPRINT_PROMPT.md) |

## Заметки при закрытии

Влито PR #1832 (35fbe763, 10.08). Раздел «CI & Testing: два яруса, два корпуса» в docs/CONTRIBUTING.md — таблица двух статей (scripts-gate ADR-0018 и vitest-gate), признак smoke числом с обоснованием порога, адрес отчёта «что не гонялось», три режима (full/scoped/floor) и явная фраза «зелёный мердж-гейт НЕ означает прогон всего набора». Указатель в корневом CONTRIBUTING.md без второй редакции. Попутно снята неправда: docs/CONTRIBUTING.md:159 объявлял обязательным прогоном полный turbo run lint typecheck test build — после b3 это перестало быть верным.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
