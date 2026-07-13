# CURRENT_TASK

> **Буфер** — при конфликте проигрывает [`MAIN_DAY_ISSUE.md`](./MAIN_DAY_ISSUE.md) и реестру.

## UI-панель «Дрейф-якоря» — финал эпика #396 (2026-07-14)

**Решения владельца 2026-07-13 (вечерний бриф):**

1. UI-панель — **завтра**, свежей сессией (не в марафоне 13.07).
2. Размещение: **владелец поднял архитектурную развилку** — возможно НЕ в кабинете,
   а **отдельный операторский UI** (например, поддомен `panel.mmbrn.tech`).
   ⚠️ **Это консилиум-гейт ДО кода**: новая UI-поверхность/приложение (кабинет vs
   отдельный panel-app) — вопрос границ, деплоя, auth. НЕ начинать компонент, пока
   консилиум не вынес вердикт по месту.
3. Эпик #396 после панели — **закрыть** (`task:archive drift-anchor-contour`);
   полевой data-anchor по реальным записям → backlog **#420** (privacy-развилка,
   не начинать без отдельного консилиума + LGTM владельца).

### Старт (вставить в начало новой сессии)

```text
Следуй docs/prompts/TASK_PROMPT_WORKFLOW.md. Эпик #396, финальная фаза: UI-панель
«Дрейф-якоря». Шаг 0 (ОБЯЗАТЕЛЬНО ДО КОДА): yarn consilium --save-as drift-panel-placement
— развилка «кабинет vs отдельный операторский UI (panel.mmbrn.tech)» (поднял владелец
2026-07-13). Затем реализация по вердикту. Контекст: memory project_drift_anchor_contour,
ADR 0004 (транспорт готов и жив).
```

### Что уже готово (не переделывать)

- Данные: `GET https://office.mmbrn.tech/v1/drift-anchor/digest` — публичный, живой,
  отдаёт записи `code:schedule` + `data:schedule` (+ `code:ci` после первого PR в detectors).
- Чистая математика: `evaluateProdMainDivergence` (@membrana/core) — danger-строка
  «Прод ≠ main» считается на потребителе, office — тупой транспорт (ADR 0004).
- Требования консилиума drift-anchor-triggers к самой панели: 3 строки
  (code/CI · code/schedule · data/schedule), возраст baseline/записи, danger-строка
  иконка+текст (не только цвет), `tabular-nums`, `aria-live="polite"`, DESIGN.md.
- Устаревание после редеплоя office ВИДИМО (takenAt): «нет свежей записи» ≠ «ok».

**Реестр:** `id: drift-anchor-contour` (эпик #396, финальная фаза)
**ADR:** [`0004-drift-anchor-journal-transport.md`](./adr/0004-drift-anchor-journal-transport.md) (ACCEPTED, E2E жив)
**Backlog после закрытия:** #420 (полевой data-anchor, privacy)

---

## Telegram-бот для союзников — спринт `telegram-ally-reports` (#428, зарегистрирован 2026-07-13)

Дайджесты дневного и вечернего ритуалов «по-простому» в приватную telegram-группу
(нетехническая аудитория). Канон — REVIEW инсайта `insight-telegram-work-reports`
(owner override веса 4.0); консилиум не нужен.

### Старт (вставить в начало новой сессии)

```text
Следуй docs/prompts/TASK_PROMPT_WORKFLOW.md и промпту:
docs/prompts/TELEGRAM_ALLY_REPORTS_PROMPT.md (блок «Промпт целиком»).
Реестр: telegram-ally-reports, Issue #428. Ветка feat/telegram-ally-reports.
```

**Owner-гейты до smoke:** BotFather-токен, приватная группа + бот, chat_id, env на office VDS.
**Коллизия-гард:** не трогать провайдер-модули office (openrouter/deepseek/rag) — заняты
спринтом llm-providers-unblock (#424/#425) в worktree Membrana-openrouter; app.module.ts
конфликт разрешать после их мёржа (мёржи 2026-07-13 вечер: конфликт разрешён, оба модуля в app.module).

---

## Второй трек: итоги дня 2026-07-13 (оба спринта закрыты)

1. **Persona Memory фаза 1** — ЗАКРЫТА (PR #422/#423). Проверка пилота = включить
   `--with-memory` на ближайшем консилиуме (напр. drift-panel-placement).
2. **llm-providers-unblock** — ЗАКРЫТ (PR #426, bf6f7fb0; ревью LGTM ×2, задачи
   заархивированы). **Хвосты на владельце (комментарии в #424/#425):**
   - #424: пополнить баланс DeepSeek → DEEPSEEK_API_KEY на office → живой ран
     триажа (метка «канал: deepseek»).
   - #425: платёжный метод Voyage (бесплатные 200M токенов сохраняются) →
     `RAG_EMBEDDING_PROVIDER=voyage yarn rag:index` → непустой RAG-блок в
     consilium/ask. Локально нужен HTTPS_PROXY (DPI режет прямой Node-хендшейк).
>>>>>>> origin/main
