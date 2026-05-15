# Документация виртуальной команды

| Файл | Назначение |
|------|------------|
| [DEVELOPER_RHYTHM.md](./DEVELOPER_RHYTHM.md) | **Ритм разработки:** утро / вечер / неделя / периодические `yarn`-команды |
| [WHITE_PAPER.md](./WHITE_PAPER.md) | Стратегический концепт: цель — распределённая разведка нижнего неба |
| [TASKS_MANAGEMENT.md](./TASKS_MANAGEMENT.md) | Методология задач: GitHub Issues (вход) + Linear (работа) + отчёт перед закрытием |
| [VIRTUAL_TEAM_PROMPT.md](./VIRTUAL_TEAM_PROMPT.md) | Системный промпт координатора и формат ответа |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Границы пакетов Membrana + правила плагинов и аудио-слоёв |
| [SERVICES.md](./SERVICES.md) | Соглашения о пакетах-сервисах в `packages/services/*` |
| [INTEGRATIONS_STRATEGY.md](./INTEGRATIONS_STRATEGY.md) | Стратегия экспериментальных интеграций анализа звука (эшелоны локально → сервер → API) |
| [WEEKLY_ANALYZERS_RESEARCH.md](./WEEKLY_ANALYZERS_RESEARCH.md) | Авто-генерируемый еженедельный «радар»: новые модели/работы для каталога §4 INTEGRATIONS_STRATEGY (`yarn analyzers:research:week`). Используется недельным планом, не дневным code-review |
| [DESIGN.md](./DESIGN.md) | Токены UI для аудио-интерфейса |
| [MODULE_AND_PLUGIN_UI.md](./MODULE_AND_PLUGIN_UI.md) | Оболочка модулей, сайдбар плагинов, карточки, Tailwind `content` |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | PR, агенты, ссылки на документы выше |
| [UI_UX_DEVELOPER_PROMPT.md](./UI_UX_DEVELOPER_PROMPT.md) | Расширение роли Верстальщика — детали для UI-агента |
| [DAILY_CODE_REVIEW.md](./DAILY_CODE_REVIEW.md) | Вечернее ревью (`yarn code-review`); утром — вход для standup |
| [STRATEGIC_PLAN_DAY.md](./STRATEGIC_PLAN_DAY.md) | План на следующий день по WHITE_PAPER и git (`yarn plan:day`) |
| [DAILY_STANDUP.md](./DAILY_STANDUP.md) | Ежедневный стендап: сводка review + план + issues + наброски (`yarn standup`) |
| [MAIN_DAY_ISSUE.md](./MAIN_DAY_ISSUE.md) | **Центральная задача дня** (`yarn main-day-issue`, после standup) |
| [CURRENT_TASK.md](./CURRENT_TASK.md) | Вспомогательный буфер черновиков (может содержать шум; не канон) |
| [STRATEGIC_PLAN_WEEK.md](./STRATEGIC_PLAN_WEEK.md) | План на неделю (`yarn plan:week`; учитывает радар аналайзеров) |
| [seanses/](./seanses/) | Протоколы консилиумов (`yarn consilium`) |
| [discussions/](./discussions/) | Треды `yarn ask` по одному персонажу |
| [prompts/](./prompts/) | Task-промпты: задания на крупные работы (новые пакеты, новые интеграции). |

## Порядок чтения для новых агентов

0. [WHITE_PAPER.md](./WHITE_PAPER.md) — зачем существует проект и какую систему мы строим.
1. [TASKS_MANAGEMENT.md](./TASKS_MANAGEMENT.md) — как живут задачи (GitHub Issues + Linear, отчёт перед закрытием).
2. [VIRTUAL_TEAM_PROMPT.md](./VIRTUAL_TEAM_PROMPT.md) — кто я и в какой команде работаю.
3. [ARCHITECTURE.md](./ARCHITECTURE.md) — где границы пакетов и слоёв.
4. [SERVICES.md](./SERVICES.md) — если задача про чистую логику + хуки.
5. [INTEGRATIONS_STRATEGY.md](./INTEGRATIONS_STRATEGY.md) — если задача про подключение новой ML/DSP-модели для анализа звука.
6. [DESIGN.md](./DESIGN.md) — если задача про вёрстку.
7. [MODULE_AND_PLUGIN_UI.md](./MODULE_AND_PLUGIN_UI.md) — если задача про модули/плагины в UI.
8. [CONTRIBUTING.md](./CONTRIBUTING.md) — как оформить PR и пройти ревью.

GitHub Actions: workflow `virtual-team-context` выводит эти пути в summary при ручном запуске.
