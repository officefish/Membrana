# Повестка: optional timer + proxy процессы (direct консилиум)

## Контекст предыдущего эксперимента

Сеанс `docs/seanses/opencode-proxy-processes-2026-06-25.md` (opencode proxy) классифицировал **существующие** yarn-ритуалы:

- **direct (prod):** `ritual:day`, `standup`, `code-review`, `ritual:evening`, `night:*`, `anthropic:smoke`
- **proxy (эксп.):** `opencode:*`, `plan:day/week`, `team-evening-feedback`, `analyzers:research:week`
- **local:** `local-code-review`
- **запрет:** правки ARCHITECTURE/ROADMAP, merge в main

Контур opencode: `.env.llm-proxy` → OpenRouter (primary) / FreeModel (fallback). Команды: `yarn opencode:ask`, `opencode:task`, `opencode:consilium`, `opencode:smoke`.

## Фокус этого консилиума

Не переклассифицировать prod-ритуалы, а **предложить новые процессы**, которые:

1. **Запускаются по таймеру** — cron, GitHub Actions `schedule:`, Windows Task Scheduler, `node-cron` в dev-скрипте, и т.п.
2. **Используют proxy** — только `yarn opencode:*` / `.env.llm-proxy`, не `ANTHROPIC_API_KEY`.
3. **Опциональны (nice-to-have)** — если не сработали (таймаут, 402, 503, нет сети, машина выключена) — **ничего не ломается**; нет блокеров для `ritual:day` / CI / merge.

Метафора: «пришло — хорошо, не пришло — и ладно».

## Уже существующие scheduled workflows (не дублировать без причины)

| Workflow | Расписание | Сейчас |
|----------|------------|--------|
| `.github/workflows/scheduled-ci.yml` | пн 06:00 UTC | CI |
| `.github/workflows/weekly-analyzers-research.yml` | пн 06:00 UTC | research |
| `.github/workflows/weekly-strategic-plan.yml` | пн 07:00 UTC | planning |

Новые идеи должны **дополнять**, а не заменять prod-ритуалы.

## Ограничения Membrana

- Монорепо: client, packages/services, device-board, background-office/media
- Аудио только через `audio-engine-service`
- RAG: `yarn rag:query` / `yarn rag:index` (operative без ключа)
- Логи клиента: `yarn logs:parse`
- Документация: catalog verify, docs sync
- Детекторы: benchmark/calibrate scripts

## Ожидаемый формат ответа консилиума

Для каждой **новой** идеи процесса:

| Поле | Содержание |
|------|------------|
| Имя (yarn script) | например `opencode:weekly:docs-drift` |
| Таймер | cron expression + где крутится (GH Action / локально) |
| Вход | файлы, git diff, RAG, issues |
| Выход | markdown в `docs/seanses/` или `docs/archive/` |
| Почему optional | что произойдёт при skip |
| Почему proxy | почему не direct |
| Оценка ценности | низкая / средняя / высокая (для nice-to-have) |

Итог: **топ-5–8** кандидатов с консенсусом и **пилот** (какие 2–3 внедрить первыми).

## Примеры направлений (не обязательно брать)

- Дрейф docs vs catalog
- Stale issue triage draft
- Dependency/changelog digest
- UI a11y smoke notes (read-only)
- RAG corpus health check
- Detector benchmark trend (если есть артефакты)
- «Идеи на неделю» из closed issues

Команда свободна предложить лучше.
