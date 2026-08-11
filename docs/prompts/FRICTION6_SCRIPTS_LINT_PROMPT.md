# Промпт: scripts/*.mjs вне линтера: дать парсер ESM и назвать шум числом

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — ESM-парсер для `scripts/**/*.mjs`, шум назван числом, порог обоснован, линт в CI.
> Реестр: `id` = `friction6-scripts-lint` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Весь агентский тулинг (`scripts/` — самая правимая часть репозитория) не проверялся
линтером: `.eslintrc.cjs` не имел override для `*.mjs`, любой файл падал парсером
(«Parsing error: The keyword 'import' is reserved»). Эпизод 26.07: перед коммитом
резака секретов три parse-ошибки оказались не поломкой автора, а отсутствием
покрытия — зелёного тут не было никогда.

Не трогаем: конфиги линта воркспейсов (apps/*, packages/*), массовую
переформатировку `scripts/` (prettier-проход — отдельное решение).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| `.eslintrc.cjs` | Единственная точка конфига (монорепо) |
| `.github/workflows/ci.yml` | Провод проверки |

**GitHub Issue:** [#1264](https://github.com/officefish/Membrana/issues/1264)

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (продуктовое описание)

1. Override в `.eslintrc.cjs` для `scripts/**/*.mjs`: `sourceType: module`,
   `ecmaVersion: latest`, `env: node`, `eslint:recommended`.
2. Прогнать по всему `scripts/` и **назвать шум числом**: сколько находок, каких
   классов — в карточке и отчёте Issue, не спрятать.
3. Порог осознанно: чистые сегодня правила запереть на `error`; накопившие долг —
   `warn` (НЕ `off`) с числом у каждого + храповик `--max-warnings=<замер>`,
   чтобы долг не рос. Гашение долга — продолжение #1264 (warn → 0 → `error`).
4. Провод: глагол `lint:scripts` + шаг в CI (`ci.yml`, рядом с `test:scripts`).

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Конфиг | `.eslintrc.cjs` | override `scripts/**/*.mjs`, порог с числами |
| Глагол | `package.json` → `lint:scripts` | eslint + `--max-warnings` храповик |
| Провод | `.github/workflows/ci.yml` | блокирующий шаг verify-джоба |

**Запрещено:**

- Молча выключить шумящее правило (`off` без числа и следа в карточке).
- Массовая переформатировка `scripts/` под линт в этом же PR.

---

### Тесты

| Область | Минимум |
|---------|---------|
| Парсер | `npx eslint scripts/secret-redact.mjs` и любой другой `.mjs` — без parse-ошибки |
| Храповик | `yarn lint:scripts` — exit 0 на текущем дереве; рост warnings валит |

---

### Definition of Done

- [ ] `npx eslint scripts/<любой>.mjs` больше не даёт parse-ошибку.
- [ ] Число находок по `scripts/` названо в отчёте карточки.
- [ ] Порог обоснован одной фразой; правила в `warn` перечислены с числами.
- [ ] Линт скриптов заведён в CI.
- [ ] LGTM Teamlead.

---

### Out of scope

- Гашение самих 133 находок (продолжение #1264, отдельные PR).
- Prettier/переформатировка; flat-config миграция ESLint 9.

---

## Acceptance criteria (scaffold)

- [x] Parse-ошибка снята: override даёт ESM-парсер всем `scripts/**/*.mjs` (1105 файлов).
- [x] Шум назван: **133 находки в 66 файлах** — `no-unused-vars` 63 (с конвенцией `^_`),
      `no-useless-escape` 55, `no-irregular-whitespace` 6, `no-regex-spaces` 5,
      `no-constant-condition` 2, `no-control-regex` 2 (замер 2026-08-11).
- [x] Порог: шесть правил `warn` + храповик `lint:scripts --max-warnings=133`;
      обоснование — шум остаётся видимым в каждом прогоне и не может расти,
      остальной recommended заперт на `error`. `off` не использован.
- [x] Провод: шаг «Root scripts — ESLint (ratchet 133 warnings)» в `ci.yml`.

## Заметки для человека-постановщика

1. GitHub Issue [#1264](https://github.com/officefish/Membrana/issues/1264) (`imperfection`).
2. Запись в `docs/tasks/registry.json` (`status: active`) — есть.
3. После merge: отчёт в Issue → `yarn task:archive friction6-scripts-lint --notes "…"`.

### Проверка после PR

```bash
npx eslint scripts/secret-redact.mjs   # нет parse-ошибки
yarn lint:scripts                       # exit 0, 133 warnings (храповик)
```

---

## Связь с дорожной картой

- Зонтик `agent-tooling-friction-6` (#1263): строка 6 хендофа 11.08.
- Гашение долга 133 → 0 — кандидаты в one-shot'ы (по классу правила за шот).
