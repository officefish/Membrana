# Промпт: Telegram-бот для союзников — дайджесты дневного и вечернего ритуалов

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — модуль `modules/telegram` в background-office + ритуальная обвязка + unit-тесты.
> Реестр: `id` = `telegram-ally-reports` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

У владельца появились **союзники** — нетехническая аудитория, не пользующаяся GitHub. Им нужен
пассивный канал прогресса проекта: приватная telegram-группа, куда бот отчитывается по итогам
**дневного ритуала** (`ritual:day` — что запланировано на день) и **вечернего ритуала**
(`ritual:evening` / `team-evening-feedback` — что сделано), **простым языком** — по правилу
«по-простому: что это значит для продукта» (закреплённая просьба владельца от 2026-07-09).

Основа — инсайт [`insight-telegram-work-reports`](../insights/insight-telegram-work-reports/INSIGHT.md)
(adopted 2026-07-06, вес 4.0 — ниже порога 6.0, но **owner override 2026-07-13**: владелец явно
запросил задачу в работу). Архитектурный канон зафиксирован в
[REVIEW инсайта](../insights/insight-telegram-work-reports/REVIEW.md) пятью ролями — консилиум
не требуется, это исполнение по готовому канону. Отличия от инсайта по слову владельца
2026-07-13: аудитория = союзники (не только владелец), **группа** (не канал), дайджесты **обоих**
ритуалов; per-merge нотификации выведены из MVP (шум для нетехнической аудитории).

Транспортный образец — **push-ingest** (ADR 0004, модуль `drift-anchor`): локальный скрипт
POST-ит payload в office, office — тупой транспорт наружу, состояния не хранит.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`insight-telegram-work-reports/REVIEW.md`](../insights/insight-telegram-work-reports/REVIEW.md) | Канон архитектуры и запреты (проголосованы) |
| [`docs/BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md) | Границы office (stateless) |
| [`docs/adr/ADR-0004-drift-anchor-journal-transport.md`](../adr/ADR-0004-drift-anchor-journal-transport.md) | Образец push-ingest: локальный cron → POST → office |
| `packages/background-office/src/modules/{github,linear,webhooks,drift-anchor}` | Образцы outbound/ingest-модулей NestJS |
| `.cursor/skills/membrana-office-vds-deploy/SKILL.md` | Деплой office на VDS 176.124.218.4 |

**GitHub Issue:** [#428](https://github.com/officefish/Membrana/issues/428).

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (продуктовое описание)

1. **Модуль `modules/telegram` в `packages/background-office`** (по образцу claude/linear/webhooks):
   - `TelegramClient` — тонкий клиент Bot API (`sendMessage`, parse_mode HTML или MarkdownV2
     с аккуратным экранированием), токен и chat id из env (`TELEGRAM_BOT_TOKEN`,
     `TELEGRAM_ALLY_CHAT_ID`). Fire-and-forget: ошибка отправки → лог, не исключение наружу.
   - `TelegramNotifier` — сервис-обёртка: принимает готовый текст дайджеста, шлёт в группу.
   - `POST /v1/telegram/ritual-digest` — endpoint приёма (guard по shared-секрету, как в
     push-ingest drift-anchor): `{ kind: 'day' | 'evening', digest: {...} }` → формат → отправка.
     Office ничего не хранит.
2. **Чистые format-функции** (в модуле, отдельный файл без Nest-зависимостей):
   `formatDayDigest(payload)` и `formatEveningDigest(payload)` — собирают человекочитаемое
   сообщение. Тестируемы без сети.
3. **Локальная обвязка ритуалов**: `scripts/telegram-ritual-digest.mjs --kind day|evening` —
   детерминированно извлекает из свежих артефактов ритуала (день: `docs/MAIN_DAY_ISSUE.md` —
   заголовок фокуса + «по-простому»-строки; вечер: `docs/seanses/team-evening-feedback-<date>.md` —
   резюме Teamlead + счётчики закрытых задач/PR дня) компактный payload и POST-ит в office.
   Подключить хвостом в `ritual:day` и `ritual:evening` в `package.json`.
   **Graceful обязателен**: нет env / office недоступен / нет артефакта → console.warn + exit 0,
   ритуал не ломается (образец graceful — night-triage narrative).

### Тон сообщений (продуктовое требование)

- Первый слой — **только простой язык**: что произошло и что это значит для продукта.
  Без SHA, номеров PR, кодовых имён спринтов, имён веток. Допустим один короткий
  технический хвост в конце («детали: N задач закрыто, M PR смёржено»).
- Формат единый и лаконичный: заголовок с датой + 3–6 булитов, без эмодзи-шума
  (требование Верстальщика из review).

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Office-модуль | `packages/background-office/src/modules/telegram/` | Bot API client, notifier, ingest-endpoint, format-функции |
| Env office | `packages/background-office/.env.example` (+ VDS) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLY_CHAT_ID`, секрет ingest |
| Локальный скрипт | `scripts/telegram-ritual-digest.mjs` | Извлечение payload из артефактов ритуала, POST в office, graceful |
| Ритм | `package.json` → `ritual:day`, `ritual:evening` | Вызов скрипта хвостом (`|| true`-семантика) |

**Запрещено** (проголосованные ограничения review — переносить дословно):

- Двусторонний бот (команды из Telegram, управление задачами).
- Очередь/retry/хранение состояния в office — office остаётся **stateless**
  (office не запущен → доклада просто нет; source of truth остаётся в git).
- Уведомления об alarm/детекциях — продуктовая фича клиента, не смешивать.
- Хардкод токена / секретов; токен только в env office.
- Публичная группа/канал — только приватная группа (dev-контент).
- Тянуть что-либо из research Q2 инсайта (галлюцинация, игнорировать целиком).
- LLM-пересказ в MVP — фаза 2; не трогать провайдер-модули (openrouter/deepseek/rag) —
  они заняты параллельным спринтом llm-providers-unblock (#424/#425) в отдельном worktree.

**Коллизия-гард:** параллельный спринт правит `app.module.ts` (регистрация deepseek-модуля).
Коммитить строго свои файлы поимённо; конфликт в `app.module.ts` разрешать после мёржа их PR.

---

### Тесты

| Область | Минимум |
|---------|---------|
| format-функции | unit: day + evening payload → снапшот текста; экранирование спецсимволов; пустые поля |
| ingest-endpoint | guard: без секрета 401/403; happy-path вызывает notifier (мок client, без сети) |
| скрипт | извлечение payload из фикстур артефактов; graceful при отсутствии файла/env |

---

### Definition of Done

- [ ] `modules/telegram` в background-office: client + notifier + endpoint, зарегистрирован в `app.module.ts`.
- [ ] `formatDayDigest` / `formatEveningDigest` — чистые, с unit-тестами (без сети).
- [ ] `scripts/telegram-ritual-digest.mjs` подключён хвостом в `ritual:day` и `ritual:evening`; при отсутствии env/office ритуалы проходят как раньше.
- [ ] `.env.example` office дополнен новыми переменными (без значений).
- [ ] Тесты background-office зелёные: `yarn workspace @membrana/background-office test` (+ lint/typecheck scope).
- [ ] Ручной smoke после деплоя на office VDS: тестовый POST → сообщение видно в приватной группе (owner-гейт: токен + chat id).
- [ ] Отчёт в Issue #428, LGTM Teamlead.

---

### Out of scope

- Per-merge нотификации (возможная фаза 2 — отдельным решением, шум для нетех-аудитории).
- Двусторонний бот, команды из Telegram.
- LLM-пересказ «по-простому» (фаза 2: через существующий ClaudeService с graceful fallback — только после закрытия llm-providers-unblock).
- Alarm/детекции, продуктовые уведомления оператору.
- Панель/визуализация канала внутри репо.

---

### Порядок работы ролей

1. **Teamlead (Vesnin)** — план, границы MVP, приёмка тона сообщений «по-простому».
2. **Структурщик (Ozhegov, lead)** — модуль по образцу claude/linear; чистые format-функции; stateless-граница office.
3. **Математик (Dynin)** — secops: секреты в env, guard endpoint, приватность контента дайджеста.
4. **Музыкант** — не задействован (следит, чтобы alarm-контур не просочился в scope).
5. **Верстальщик (Rodchenko)** — «вёрстка» текста сообщений: единый шаблон, экранирование, без эмодзи-шума.

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: …
[Музыкант]: …
[Верстальщик]: …

Итоговый артефакт: …
Definition of Done: …
```

---

## Заметки для человека-постановщика

1. **Owner-гейты (до smoke):**
   - создать бота у @BotFather → `TELEGRAM_BOT_TOKEN`;
   - создать **приватную** группу союзников, добавить бота;
   - получить `chat_id` группы (`getUpdates` после первого сообщения в группе);
   - прописать env на office VDS (176.124.218.4) + редеплой (скилл `membrana-office-vds-deploy`).
2. После merge: отчёт в Issue #428 → `yarn task:archive telegram-ally-reports --notes "PR #…"`.

### Проверка после PR

```bash
yarn workspace @membrana/background-office test
node scripts/telegram-ritual-digest.mjs --kind evening --dry-run   # payload в stdout, без сети
# smoke (после env на office): тестовый POST с секретом → сообщение в группе
```

---

## Связь с дорожной картой

- Инсайт: `insight-telegram-work-reports` (adopted 4.0, owner override 2026-07-13).
- Не в критическом пути FREE-тарифа; коммуникационный контур (союзники/стейкхолдеры).
- Server-first стратегия владельца: публикатор — office VDS, локальные скрипты только push.
