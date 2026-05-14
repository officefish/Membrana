# Документация виртуальной команды

| Файл | Назначение |
|------|------------|
| [WHITE_PAPER.md](./WHITE_PAPER.md) | Стратегический концепт: цель — распределённая разведка нижнего неба |
| [TASKS_MANAGEMENT.md](./TASKS_MANAGEMENT.md) | Методология задач: GitHub Issues (вход) + Linear (работа) + отчёт перед закрытием |
| [VIRTUAL_TEAM_PROMPT.md](./VIRTUAL_TEAM_PROMPT.md) | Системный промпт координатора и формат ответа |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Границы пакетов Membrana + правила плагинов и аудио-слоёв |
| [SERVICES.md](./SERVICES.md) | Соглашения о пакетах-сервисах в `packages/services/*` |
| [INTEGRATIONS_STRATEGY.md](./INTEGRATIONS_STRATEGY.md) | Стратегия экспериментальных интеграций анализа звука (эшелоны локально → сервер → API) |
| [DESIGN.md](./DESIGN.md) | Токены UI для аудио-интерфейса |
| [MODULE_AND_PLUGIN_UI.md](./MODULE_AND_PLUGIN_UI.md) | Оболочка модулей, сайдбар плагинов, карточки, Tailwind `content` |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | PR, агенты, ссылки на документы выше |
| [UI_UX_DEVELOPER_PROMPT.md](./UI_UX_DEVELOPER_PROMPT.md) | Расширение роли Верстальщика — детали для UI-агента |
| [DAILY_CODE_REVIEW.md](./DAILY_CODE_REVIEW.md) | Авто-генерируемый отчёт ежедневного ревью (`yarn code-review`) |
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
