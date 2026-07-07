# INSIGHT: Докладывать о проделанной работе через Telegram-канал на базе background-office

| Поле | Значение |
|------|----------|
| **ID** | `insight-telegram-work-reports` |
| **Статус** | draft |
| **Источник** | user |
| **Создан** | 2026-07-06 |

---

## Проблема / наблюдение

Отчётность о проделанной работе сейчас распределена по артефактам репозитория: merged PR,
`chore(tasks)`-коммиты, карточки архива задач, `team-evening-feedback`, DAY_SPRINT_LOG.
Чтобы узнать «что сделано сегодня/за спринт», нужно быть внутри репо и знать, куда смотреть.
Владелец и внешние наблюдатели (партнёр по коммуникациям, будущие стейкхолдеры free-тарифа)
не имеют пассивного канала уведомлений — приходится спрашивать или читать git.

## Гипотеза

Если публиковать структурированные доклады о завершённой работе в Telegram-канал
(merge PR + закрытие задач/спринтов, дневная сводка вечернего ритуала), владелец получает
пассивную ленту прогресса в привычном мессенджере, а команда — дисциплину «работа не
закончена, пока не задокладована». Технически интеграция ложится в
`@membrana/background-office` (:3000, stateless) — там уже живут интеграции Claude / GitHub /
Linear / webhooks; Telegram Bot API — ещё один outbound-модуль по тому же образцу
(`modules/telegram`), с триггерами от GitHub webhook (merge) и/или CLI-скрипта вечернего
ритуала (`ritual:evening` → POST в office → канал).

## Scope (черновик)

- In scope:
  - Модуль `modules/telegram` в `packages/background-office`: Bot API client (токен/канал в env),
    шаблоны сообщений (merged PR, задача заархивирована, вечерняя сводка).
  - Источники событий: GitHub webhook (уже есть `modules/webhooks`) + ручной/скриптовый
    endpoint для сводки дня (вызов из `ritual:evening` / `team-evening-feedback`).
  - Регламент: какие события докладываются (merge в main, archive задачи, закрытие спринта).
- Out of scope:
  - Двусторонний бот (команды из Telegram, управление задачами).
  - Уведомления оператору о детекциях/alarm (это продуктовая фича клиента, не dev-отчётность).
  - Хранение состояния в office (границы BACKGROUND_SERVERS: office — stateless).

## Связи

- Эпики / PR: свежий пример отчётного цикла — `device-board-journal-sidebar` (PR #269,
  closure review LGTM, архив) — кандидат на формат «доклада о задаче».
- Документы: `docs/BACKGROUND_SERVERS.md` (границы office), `.cursor/skills/membrana-background-servers/SKILL.md`,
  `docs/prompts/TASK_CLOSURE_REGULATION.md` (что считается закрытием),
  `membrana-team-evening-feedback` (вечерняя сводка — готовый контент для канала).

## Вопросы для research (Q1–Q3)

1. **Landscape:** как команды организуют dev-отчётность в Telegram (bot API, каналы vs группы,
   rate limits 20 msg/min на группу, форматирование MarkdownV2/HTML, threading) — типовые
   паттерны CI→Telegram нотификаций (GitHub Actions marketplace, webhook-релеи)?
2. **Fit (Membrana):** что докладывать без шума — гранулярность (каждый merge vs дневная
   сводка), как переиспользовать существующие артефакты (карточки архива, evening feedback,
   DAY_SPRINT_LOG) как источник текста; NestJS-паттерн outbound-модуля рядом с
   claude/linear/webhooks в office?
3. **Risk:** утечка приватного контента репо в канал (кто читатели, нужен ли приватный канал),
   хранение bot token (env office vs GitHub Actions secret), надёжность доставки
   (office не запущен → потерянный доклад; нужна ли очередь/retry или fire-and-forget)?
