# Архив: Секрет-гейт локально = CI: проверка по диапазону вместо растущей истории

| Поле | Значение |
|------|----------|
| **ID** | `friction6-secret-gate-parity` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-26 |
| **Архивирована** | 2026-07-26 |
| **GitHub Issue** | #1262 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/FRICTION6_SECRET_GATE_PARITY_PROMPT.md`](../../docs/prompts/FRICTION6_SECRET_GATE_PARITY_PROMPT.md) |

## Заметки при закрытии

PR #1278 + #1279 (Closes #1262). Паритет двухслойный: (1) объём — pre-push гоняет detect --log-opts=origin/main..HEAD тем же ruleset и baseline, что CI, вместо protect --staged по индексу; CI на pull_request сканирует диапазон заявки, полная история осталась на push:main — одна ветка больше не красит чужие заявки; (2) ВЕРСИЯ — найдено проверкой падением: локальный gitleaks 8.30.1 не считает находкой синтетический PEM, а пришпиленный в CI 8.21.2 считает, поэтому versionParity называет расхождение вслух. Норма про рантайм-сборку образцов: baseline .gitleaksignore привязан к SHA и при ребейзе рассыпается.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
