# Team Evening Feedback — регламент

> **Версия:** 0.1 (2026-06-23)  
> **Системный промпт:** [`TEAM_EVENING_FEEDBACK.md`](./TEAM_EVENING_FEEDBACK.md)  
> **Ритм:** [`docs/DEVELOPER_RHYTHM.md`](../DEVELOPER_RHYTHM.md) · вечер после `code-review`.

---

## Назначение

Коллективная **ретроспектива дня** виртуальной команды (пять ролей): оценить утренние и вечерние артефакты, обсудить итоги в свободной форме, предложить фокус на завтра, проголосовать за полезность дня (шкала 1–10), подвести резюме Teamlead о соответствии стратегии дня.

Отличие от `yarn consilium`: не разовый вопрос, а **ежедневный обзор рутинных документов** и фактической работы (git).

| | `yarn consilium` | `yarn team-evening-feedback` |
|---|----------------|----------------------------|
| Повод | Спорный вопрос / архитектура | Конец рабочего дня |
| Вход | Вопрос + опциональный контекст | План дня, стендап, MAIN_DAY_ISSUE, DAILY_CODE_REVIEW, git log |
| Выход | `docs/seanses/<slug>-<date>.md` | `docs/seanses/team-evening-feedback-<date>.md` |
| Голосование | Нет | Да, /10 от каждой роли + среднее |

---

## Когда запускать

**После** вечернего code-review (`docs/DAILY_CODE_REVIEW.md` уже записан).

Порядок в `yarn ritual:evening`:

1. `archive:daily-day`
2. `rag:index:incremental` (опционально, нужен `OPENAI_API_KEY`)
3. `code-review` → `DAILY_CODE_REVIEW.md`
4. `save-code-review`
5. `task:close-github` (батч закрытия Issues)
6. **`team-evening-feedback`** → `docs/seanses/team-evening-feedback-<YYYY-MM-DD>.md`

Утром **не генерировать** заново — читать вчерашний протокол при планировании (`standup` может ссылаться на него опционально).

---

## Входы (что подмешивает скрипт)

| Артефакт | Путь | Обязательность |
|----------|------|----------------|
| Регламент | `docs/prompts/TEAM_EVENING_FEEDBACK_REGULATION.md` | да |
| Промпт | `docs/prompts/TEAM_EVENING_FEEDBACK.md` | да |
| Виртуальная команда | `docs/VIRTUAL_TEAM_PROMPT.md` | да |
| План дня | `docs/STRATEGIC_PLAN_DAY.md` | если есть |
| Стендап | `docs/DAILY_STANDUP.md` | если есть |
| Канон дня | `docs/MAIN_DAY_ISSUE.md` | если есть |
| Вечернее ревью | `docs/DAILY_CODE_REVIEW.md` | **желательно** (после code-review) |
| Буфер задач | `docs/CURRENT_TASK.md` | опционально |
| Git за день | `git log --since=midnight` | да |
| RAG | operative | опционально (`--no-rag`) |

---

## Выход

- **Путь по умолчанию:** `docs/seanses/team-evening-feedback-<YYYY-MM-DD>.md`
- **Переименование:** `yarn team-evening-feedback --save-as w0-hotfix`
- **Только stdout:** `--no-save`
- **Без API:** `--dry-run`

---

## Команды

```bash
yarn team-evening-feedback
yarn team-evening-feedback:dry      # собрать контекст, не вызывать API
yarn team-evening-feedback --no-rag
yarn team-evening-feedback --save-as device-board-w0

# Полный вечер (включая фидбек):
yarn ritual:evening
```

Требуется `ANTHROPIC_API_KEY` в `.env` (как `yarn standup` / `yarn code-review`).

---

## Cursor / агент

- Skill: [`.cursor/skills/membrana-team-evening-feedback/SKILL.md`](../../.cursor/skills/membrana-team-evening-feedback/SKILL.md)
- Пользователь: «вечерний фидбек команды», «team evening feedback», «ритуал вечера» → `yarn team-evening-feedback` после `code-review`.
- Не подменять `consilium` — для спорных архитектурных вопросов в течение дня.

---

## Definition of Done (сеанс)

- [ ] Все пять ролей дали блок `[Роль]:` с оценкой артефактов и предложением на завтра.
- [ ] Таблица голосования /10 и **средний балл команды**.
- [ ] Блок **«Резюме Teamlead»**: соответствие `MAIN_DAY_ISSUE` / плану дня, уход от центральной цели (да/нет).
- [ ] Протокол сохранён в `docs/seanses/`.
