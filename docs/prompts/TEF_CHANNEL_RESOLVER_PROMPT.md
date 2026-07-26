# Промпт: Вечерний фидбек команды через резолвер каналов процедур

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **S**.
> Ожидаемый артефакт: **1 PR** — `team-evening-feedback` зовёт цепочку каналов вместо Anthropic напрямую.
> Реестр: `id` = `tef-channel-resolver` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

`team-evening-feedback` — обязательный завершающий шаг дня по [`CLAUDE.md`](../../.claude/CLAUDE.md).
Сейчас он бьёт в Anthropic напрямую ([`scripts/team-evening-feedback.mjs:107`](../../scripts/team-evening-feedback.mjs))
через `getAnthropicKey` / `anthropicPost`, без фолбэка. Anthropic исчерпан до 01.08 — поэтому
**протокола за 25.07 нет вообще**, прогон сухой, и это уже вторые сутки потери обязательного шага.

Резолвер каналов процедур **уже построен и доказан**: эпик `llm-procedure-channels` (#1007),
фазы #1008–#1011 закрыты. `code-review` через него ходит и **в том же вечернем прогоне 25.07
отработал на grok** — то есть механизм работает на живых данных. Задача: перенести доказанный
механизм в соседний вызов. Ни резолвер, ни каталог провайдеров, ни цепочки других процедур
не трогаем — только регистрация своей процедуры и замена одного блока вызова.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`scripts/code-review.mjs`](../../scripts/code-review.mjs) | **Эталон**: строки 137–185 — вызов, `onAttempt`, провенанс в артефакт, честный exitCode |
| [`scripts/lib/llm-procedure-ritual.mjs`](../../scripts/lib/llm-procedure-ritual.mjs) | `invokeProcedureLlm` — контракт вызова |
| [`scripts/lib/llm-procedures.json`](../../scripts/lib/llm-procedures.json) | Реестр процедур-каналов (сейчас 6 id, своего нет) |
| [`scripts/lib/llm-procedure-defaults.json`](../../scripts/lib/llm-procedure-defaults.json) | Цепочки по умолчанию |
| [`scripts/lib/llm-procedure-schema.json`](../../scripts/lib/llm-procedure-schema.json) | Схема записи процедуры |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue / PR |

**GitHub Issue:** [#1210](https://github.com/officefish/Membrana/issues/1210) · эпик [#1007](https://github.com/officefish/Membrana/issues/1007)

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (продуктовое описание)

1. Зарегистрировать процедуру `team-evening-feedback` в реестре каналов
   (`scripts/lib/llm-procedures.json`) и цепочку в `scripts/lib/llm-procedure-defaults.json`
   тем же составом, что у `code-review`: `anthropic` → `openrouter` → `deepseek` → `xai`.
2. В `scripts/team-evening-feedback.mjs` заменить блок прямого вызова
   (`getAnthropicKey` + `anthropicPost` + разбор `json.content`) на `invokeProcedureLlm`
   с `onAttempt`-логом — построчно по образцу `scripts/code-review.mjs:137-150`.
3. Записывать провенанс канала **в сам протокол**: `llmProvider` / `llmModel` / `llmSource`
   в шапку (как это делает `writeReviewMarkdown` в `code-review`). Из файла должно быть видно,
   кто отвечал, без чтения консоли.
4. Цепочка исчерпана → честная **1** и текст, отличающий «нет кредита ни на одном звене»
   от «скрипт сломался». Файл при исчерпанной цепочке **не пишется** — пустой протокол хуже
   отсутствующего, он выдаёт себя за состоявшийся ритуал.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Реестр каналов | `scripts/lib/llm-procedures.json` | запись процедуры `team-evening-feedback` по схеме |
| Цепочка | `scripts/lib/llm-procedure-defaults.json` | 4 звена, как у `code-review` |
| Вызов | `scripts/team-evening-feedback.mjs` | `invokeProcedureLlm` + `onAttempt` + провенанс в артефакт |
| Запись | `writeEveningFeedbackMarkdown` | принимает `meta` с провайдером/моделью/источником |

**Запрещено:**

- Менять `invokeProcedureLlm`, каталог провайдеров, цепочки **других** процедур.
- Заводить второй транспорт или собственный fetch к провайдеру.
- `process.exit()` после сетевого вызова — на Windows обрыв процесса при живых сокетах роняет
  libuv ассертом `UV_HANDLE_CLOSING` и подменяет код возврата на 127 (прецедент 15.07: фолбэк
  «Anthropic без кредита» отдал 127, и это осталось незамеченным). Выход только через `exitCode`.
- Трогать путь `--dry-run`: он не зовёт API и не должен требовать ни одного ключа.
- Ронять `--no-save` и `--save-as`.

---

### Тесты

| Область | Минимум |
|---------|---------|
| Фолбэк | первое звено падает → отвечает второе; артефакт записан, в шапке `provider` второго звена |
| Исчерпание | все звенья падают → exit 1 **и файл не создан** |
| Ритуальная обвязка | существующий `scripts/team-evening-feedback-ritual.test.mjs` остаётся зелёным |
| dry-run | API не вызывался, ключи не требуются |

---

### Definition of Done

- [ ] Процедура `team-evening-feedback` есть в реестре каналов и валидна по схеме (`yarn validate:procedure` / соответствующая проверка).
- [ ] `scripts/team-evening-feedback.mjs` не содержит прямых обращений к `api.anthropic.com`.
- [ ] Провенанс канала виден в шапке `docs/seanses/team-evening-feedback-<date>.md`.
- [ ] Тесты из таблицы выше — зелёные.
- [ ] **Живой прогон вечером дня сдачи** даёт протокол с `provider ≠ anthropic`. Anthropic исчерпан
      до 01.08, поэтому такой протокол — доказательство, что фолбэк реально сработал, а не заявление о нём.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный (scope: `scripts/`).
- [ ] LGTM Teamlead.

---

### Out of scope

- Панель usage и office-оверлей (фазы #1010/#1011 эпика, закрыты).
- Перевод на резолвер других шагов ритуала — генератор задачи дня идёт отдельной карточкой
  `main-day-issue-channel-diagnosis` (#1239).
- Изменение содержания промпта фидбека и формата протокола (кроме шапки провенанса).

---

### Порядок работы ролей

1. **Teamlead (Vesnin)** — сверить, что задача остаётся S: одна запись в реестр + один блок вызова.
2. **Структурщик (Ozhegov)** — формулировка шапки провенанса и текста ошибки «цепочка исчерпана».
3. **Математик (Dynin)** — предикаты тестов: фолбэк, исчерпание, «файл не создан», честный код возврата.
4. **Музыкант (Kuryokhin)** — не участвует.
5. **Верстальщик (Rodchenko)** — не участвует (UI нет).

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: …

Итоговый артефакт: …
Definition of Done: …
```

---

---

## Acceptance criteria (scaffold)

- [ ] Прямых вызовов Anthropic в скрипте нет; вызов идёт через `invokeProcedureLlm`.
- [ ] Цепочка = 4 звена, состав совпадает с `code-review`.
- [ ] Артефакт содержит имя ответившего звена.
- [ ] Исчерпанная цепочка: exit 1, файла нет, текст ошибки читаемый.
- [ ] Живой вечерний протокол дня сдачи существует и записан не Anthropic.

## Заметки для человека-постановщика

1. GitHub Issue [#1210](https://github.com/officefish/Membrana/issues/1210) + ссылка на этот файл.
2. Запись в `docs/tasks/registry.json` — `tef-channel-resolver`, `status: active`, `parentEpic: llm-procedure-channels`.
3. После merge: отчёт в Issue → `yarn task:archive tef-channel-resolver --notes "PR #N, провенанс канала в протоколе <date>"`.

### Проверка после PR

```bash
yarn team-evening-feedback:dry          # API не зовётся
yarn team-evening-feedback              # живой прогон: в шапке provider ≠ anthropic
node --test scripts/team-evening-feedback-ritual.test.mjs
```

---

## Связь с дорожной картой

- Закрывает дыру эпика `llm-procedure-channels` (#1007): обязательный шаг дня остался вне резолвера.
- Возвращает обязательство `CLAUDE.md` (Team Evening Feedback) в рабочее состояние на исчерпанном Anthropic.
