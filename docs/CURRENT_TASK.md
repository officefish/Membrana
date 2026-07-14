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

**✅ РАЗВИЛКА РАЗРЕШЕНА 2026-07-14** консилиумом office-panel-contour (25 реплик):
борды живут в **`apps/panel`** (panel.mmbrn.tech), НЕ в кабинете. Шаг 0 больше не
нужен. Drift-борд теперь = потребитель каркаса эпика #438 (OP1–OP5) — делать ПОСЛЕ
scaffold+auth или параллельно от заглушки раздела.

### Старт (вставить в начало новой сессии)

```text
Следуй docs/prompts/TASK_PROMPT_WORKFLOW.md. Эпик #396, финальная фаза: UI-панель
«Дрейф-якоря» — размещение РЕШЕНО (консилиум office-panel-contour-2026-07-14):
apps/panel (эпик #438). Реализация борда по требованиям drift-anchor-triggers
(3 строки якорей, danger «Прод ≠ main» иконка+текст, tabular-nums, aria-live).
Контекст: memory project_drift_anchor_contour, ADR 0004.
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

**ИТОГ 13.07: спринт ЗАКРЫТ** (PR #431 + hotfix 0291f954, архив). E2E живой: оба дайджеста
доставлены в группу (sent=true). Памятка союзника: `docs/comms/ALLY_PRIMER.md` + артефакт.

### Второй трек на 2026-07-14: дайджесты v2 (#434, решение владельца 13.07 вечер)

Выжимка остаётся технической, но подробной; пояснения о проекте вшиты в каждый отчёт
«мелкими буквами» = **expandable blockquote** в Telegram-HTML; источник шапки — **.md в
docs/comms/** (краткая версия ALLY_PRIMER), бот конвертирует md→Telegram-HTML. Совсем
убирать пояснения нельзя — «фоновая реклама». S/M-задача, канон модуля уже есть (#428).

```text
Следуй docs/prompts/TASK_PROMPT_WORKFLOW.md. Задача #434: telegram-дайджесты v2 —
md-шапка пояснений (blockquote expandable) + подробная фактура day/evening.
Контекст: memory telegram-ally-reports, scripts/telegram-ritual-digest.mjs,
modules/telegram, docs/comms/ALLY_PRIMER.md. Не смешивать с LLM-пересказом (отдельно).
```

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

---

## Спринт agent-tooling-friction (#433) — ЗАКРЫТ 2026-07-14

PR #436 (+CI-фикс fd1a39f6), closure LGTM, архив. Инструменты в main:
`yarn insight:drift` (в ritual:evening), `yarn llm:probe`, gitignore ревью-артефактов,
proxy-чистка тестов office.

---

## Эпик office-panel (#438) — ВСЕ 5 ФАЗ ЗАКРЫТЫ 2026-07-14

OP1 scaffold → OP2 auth → OP3 welcome/shell → OP4 деплой-комплект → OP5 hardening
(PR #440–#450). Эпик-карточка active до живого деплоя. **Хвост (owner):** DNS
`panel.mmbrn.tech → 176.124.218.4` → `yarn panel:dns-gate --expect 176.124.218.4`
[go] → секреты PANEL_* + GitHub OAuth App → docs/deploy/PANEL_DEPLOY.md → smoke →
`task:archive office-panel-contour`. ⚠️ Баланс Anthropic исчерпан 14.07 —
consilium/ask/авторевью на fallback до пополнения.

---

## Борд detector-compare (#452, магистраль 14.07) — ГОТОВ К СТАРТУ

Таблица trends DRONE_TIGHT vs yamnet в панели. Консилиум-гейт пройден
(docs/seanses/detector-compare-board-2026-07-14.md, 6 развилок). Карточка
`panel-detector-compare-board` (M, parentEpic office-panel-contour).

### Старт (вставить в начало новой сессии)

```text
Следуй docs/prompts/PANEL_DETECTOR_COMPARE_BOARD_PROMPT.md (реестр:
panel-detector-compare-board, Issue #452). Вердикты консилиума
detector-compare-board-2026-07-14 НЕ переоткрывать. Порядок: экспортёр
(scripts/detector-compare-export.mjs на инфраструктуре benchmark:detectors,
снапшот-тесты) → docs/reports/detector-compare/latest.json в git → UI-раздел
detector-compare в apps/panel (mini-waveform локально, попап <dialog>, фильтры
все/дрон/не-дрон/расхождения, сортировка по уверенности, сводка P/R/F1/FPR).
Запреты: live-вычисления, office/detectors/* не трогать, без новых зависимостей
панели, без LLM, аудио-бандл вне git. Прогон требует yarn detectors:build.
Closure review при пустом API — fallback --review-file (tier из манифеста).
```

### Старт фазы эпика (архив, фазы закрыты)

```text
Следуй docs/prompts/OFFICE_PANEL_CONTOUR_PROMPT.md (эпик office-panel-contour,
Issue #438, реестр op1..op5). Решения консилиума office-panel-contour-2026-07-14
НЕ переоткрывать. Порядок OP1→OP2→OP3→OP4→OP5, мерж по готовности фазы.
Owner-гейты: DNS A-запись panel.mmbrn.tech, GitHub OAuth App, HMAC-secret.
```

**Очередь после (решения владельца):** task-archive-storage (7.6) сразу после
пополнения Voyage; slide-fullscreen — фича следующего тарифа, не брать.
