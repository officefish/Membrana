# Архив: Деплой как процедура с прогонами: две процедуры по серверам (office-VDS, media-VPS) + врезка журнала в боевые глаголы

| Поле | Значение |
|------|----------|
| **ID** | `deploy-procedures` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-08-04 |
| **Архивирована** | 2026-08-04 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/DEPLOY_PROCEDURES_PROMPT.md`](../../docs/prompts/DEPLOY_PROCEDURES_PROMPT.md) |

## Заметки при закрытии

Спринт membrana-local-sprint, ратифицирован владельцем 04.08 16:26Z. PR #1717 merged: две процедуры по серверам (deploy-office-vds: office+panel; deploy-media-vps: media/cabinet/device-board/root-site) в реестре процедур (23→25), validateProcedure 27/27; обёртка deploy:run (open→exec→close, exit прозрачен, секреты не текут); врезка в cabinet:deploy:prod и vds:run, deploy:when-green не тронут; ADR-0023 ACCEPTED с амандментом Р1 (слово владельца: процедура на сервер). Гейт 3/3 honest_pair; журнальный прогон закрыт производителем. Первый живой прогон — при первой выкладке рукой владельца.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
