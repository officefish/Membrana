## Документация

Два слоя: **нормативные** документы в `docs/` (архитектура, ритм, agent catalog) и **продуктовый** сайт Mintlify в `apps/docs/` (операторская и developer-документация; сейчас в основном **device-board** MVP — узлы, редактор, cookbooks, concepts). Регламент sync: [`docs/DOCUMENTATION_WORKFLOW.md`](./docs/DOCUMENTATION_WORKFLOW.md).

| Куда                                                           | Что                                                                                                                  |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [`docs/README.md`](./docs/README.md)                           | Навигация по нормативным документам (агенты, архитектура, CONTRIBUTING)                                              |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)               | Границы пакетов, плагины, аудио-слои                                                                                 |
| [`docs/MEMBRANE_PLATFORM.md`](./docs/MEMBRANE_PLATFORM.md)     | Кабинет, pairing, SKU (web / Studio / Device)                                                                        |
| [`packages/services/README.md`](./packages/services/README.md) | Каталог сервисов и детекторов                                                                                        |
| [`apps/docs/`](./apps/docs/README.md)                          | **Mintlify** — device-board (node reference, editor UX, cookbooks); preview: `yarn docs:dev` → http://localhost:3333 |
| Каждый пакет                                                   | Свой `README.md` с API и примерами                                                                                   |
