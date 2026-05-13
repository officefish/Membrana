# Документация виртуальной команды

| Файл | Назначение |
|------|------------|
| [VIRTUAL_TEAM_PROMPT.md](./VIRTUAL_TEAM_PROMPT.md) | Системный промпт координатора и формат ответа |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Границы пакетов Membrana + правила плагинов и аудио-слоёв |
| [SERVICES.md](./SERVICES.md) | Соглашения о пакетах-сервисах в `packages/services/*` |
| [DESIGN.md](./DESIGN.md) | Токены UI для аудио-интерфейса |
| [MODULE_AND_PLUGIN_UI.md](./MODULE_AND_PLUGIN_UI.md) | Оболочка модулей, сайдбар плагинов, карточки, Tailwind `content` |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | PR, агенты, ссылки на документы выше |
| [UI_UX_DEVELOPER_PROMPT.md](./UI_UX_DEVELOPER_PROMPT.md) | Расширение роли Верстальщика — детали для UI-агента |
| [DAILY_CODE_REVIEW.md](./DAILY_CODE_REVIEW.md) | Авто-генерируемый отчёт ежедневного ревью (`yarn code-review`) |

## Порядок чтения для новых агентов

1. [VIRTUAL_TEAM_PROMPT.md](./VIRTUAL_TEAM_PROMPT.md) — кто я и в какой команде работаю.
2. [ARCHITECTURE.md](./ARCHITECTURE.md) — где границы пакетов и слоёв.
3. [SERVICES.md](./SERVICES.md) — если задача про чистую логику + хуки.
4. [DESIGN.md](./DESIGN.md) — если задача про вёрстку.
5. [MODULE_AND_PLUGIN_UI.md](./MODULE_AND_PLUGIN_UI.md) — если задача про модули/плагины в UI.
6. [CONTRIBUTING.md](./CONTRIBUTING.md) — как оформить PR и пройти ревью.

GitHub Actions: workflow `virtual-team-context` выводит эти пути в summary при ручном запуске.
