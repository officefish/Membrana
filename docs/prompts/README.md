# docs/prompts — task-промпты

Эта папка — для **task-промптов**: текстов-заданий, которые формулируют конкретную работу для агента-разработчика (Cursor IDE, Claude, другой LLM). Они отличаются от «role-промптов» в [`../virtual-team/`](../virtual-team/):

| Категория | Где живёт | Зачем |
|-----------|-----------|-------|
| **Role-промпт** | `docs/virtual-team/PROMPT_*.md` | Личность и зона ответственности роли (Vesnin, Dynin, …). Долгоживущий. |
| **Task-промпт** | `docs/prompts/*.md` (эта папка) | Постановка конкретной большой задачи: что построить, какие границы, DoD. Долгоживущий как артефакт спецификации. |

Task-промпты:

- Пишутся, когда задача слишком крупная для GitHub Issue (новый пакет, новое приложение, новая интеграция).
- Включают раздел «что прочитать первым» — ссылки на стратегические документы.
- Имеют чёткий **Definition of Done** и **Out of scope**.
- Не заменяют GitHub Issue: для трекинга работы — отдельный Issue ссылается на промпт.

| Файл | Что задаёт |
|------|------------|
| [`API_SERVER_BOOTSTRAP_PROMPT.md`](./API_SERVER_BOOTSTRAP_PROMPT.md) | **Этап 1 (бутстрап).** Создаёт `packages/background-office/` — централизованный сервер с интеграциями Claude и Linear. Модель аутентификации (shared secret, Linear-секреты, GitHub-credentials) сейчас в фазе уточнения — см. PR #17, отложен. |
| [`SERVER_DEPLOYMENT_PROMPT.md`](./SERVER_DEPLOYMENT_PROMPT.md) | **Этап 5 (продовый деплой).** Регистрация домена, DNS, HTTPS, выбор хостинга (PaaS vs VPS), секреты в env провайдера, боевой Linear webhook. Зависит от завершения этапа 1; результат — публичный `https://<domain>/health` → `200`. |
| [`FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md`](./FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md) | **Плагин микрофона:** пороговый FFT-тест (ручной/авто, 3–10 кадров, строгость лёгкий/средний/строгий), UI-такты, телеметрия. Математика в `fft-analyzer-service`, UI в `apps/client`. |

Сквозной журнал работы по пакету `background-office` (от идеи до прода) —
[`../discussions/background-office-v0.1.md`](../discussions/background-office-v0.1.md).
Этот журнал дополняется после каждого этапа.
