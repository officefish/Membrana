# Replit bridge — легитимизация

> Было: half-landed эксперимент 17.07 (Claude-сессия `025b5696-…`).  
> Сейчас: ветка `feat/replit-demo-bridge` — мост + тесты + `docs/replit-tasks/` (README/_TEMPLATE).

## Замысел

Транспорт задания Membrana ↔ Replit-агент **через git** (у Agent нет публичного API):
`yarn replit:task` → ветка `replit/<slug>` → агент в Repl → `yarn replit:pull-demo` → `apps/demos/`.

Цель продукта поверх моста: лендинг / соревнование на Replit — **отдельный** спринт, не этот PR.

## Сессия-источник

`C:\Users\user190825\.claude\projects\C--Users-user190825-practice-Membrana\025b5696-d004-4478-a457-020c6a9faf47.jsonl`  
(~17.07 22:13–22:33 MSK): DeepSeek smoke + двусторонний git-мост.

## Правило

Не удалять `replit:*` yarn-скрипты как «сироты». Брифы `docs/replit-tasks/<slug>.md` — транспорт (gitignore); канон — `README.md` + `_TEMPLATE.md`.
