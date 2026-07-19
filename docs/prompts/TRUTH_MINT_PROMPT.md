# Промпт: truth mint — писатель токенов правды

> **Task-промпт для агента-разработчика.**
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **S**. Ожидаемый артефакт: **1 PR** — подкоманда `truth mint`
> (валидация формы, отказ на дубль, посылки в parents, автопрогон verify).
> Реестр: `id` = `truth-mint` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

#642 п.2: пять токенов 18.07 зачеканены правкой `docs/truth/registry.json` самописным
скриптом в scratchpad; проверку на дубль `id` агент писал сам. `scripts/truth.mjs`
умеет `verify`/`cool`/`review`/`radius`/`utterance`/`ask-check` — писателя нет.
Кривой токен ляжет молча и всплывёт позже на инвариантах, уже без контекста сессии.
Спринт идёт ПОСЛЕ `utterance` (PR #647): указатель на реплику для owner-токена
теперь достаётся штатно.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| GitHub Issue #642 (п.2) | Эпизод, эскиз, границы |
| [`scripts/lib/truth-graph.mjs`](../../scripts/lib/truth-graph.mjs) | Ядро: `buildGraph`/`checkInvariants` — валидация mint строится НА НИХ |
| [`scripts/truth.mjs`](../../scripts/truth.mjs) | CLI-обвязка, сюда подкоманда |
| `docs/insights/insight-truth-tokens-owner-facts/INSIGHT.md` | Канон формы токена — НЕ меняется |

**GitHub Issue:** #642.

---

## Промпт целиком (для вставки агенту)

### Что построить

1. `yarn truth mint --file <token.json> [--execute] [--json]`:
   - по умолчанию **dry-run** (валидация + что будет записано), запись только с
     `--execute` — конвенция репо (`pr:ship`, `repo:clean`; урок TF-4 «молча делает
     вместо показа»);
   - валидация формы: `id` kebab-case, непустой `claim`, `class` ∈ owner|derived,
     `revocation` присутствует; дефолты писателя: `status: active`, `parents: []`;
   - **отказ на дубль `id`**;
   - **инварианты — ядром, не дублем**: кандидат-реестр (текущий + новый токен)
     прогоняется через `buildGraph` + `checkInvariants`; новые error-нарушения →
     отказ писать. Это покрывает регламентное «список длиннее parents → не дедукция»
     (I3 контрабанда/лишняя посылка) без второго места подсчёта — против расхождения
     двух мест в ядре прямое предупреждение (история 17.07, evidenceLabel);
   - owner без `source.utterance` → warning с подсказкой `yarn truth utterance` (I7);
   - после записи — автопрогон `truth verify`, exit-код от него.
2. Формат записи — как в файле (indent 2), токен добавляется в конец `tokens`.

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Чистая валидация | экспорт `validateMint(registry, token)` в `truth.mjs` | {errors, warnings, token-с-дефолтами}; инварианты — вызовом ядра |
| CLI | `truth.mjs` подкоманда `mint` | fs, dry-run/execute, вёрстка, verify |
| Тест | в `scripts/transcript.test.mjs` или отдельный | см. ниже |

**Запрещено:**

- Менять форму токена (канон) и ядро `truth-graph.mjs`.
- Автопочинка чего-либо существующего в реестре (#533): mint только ДОБАВЛЯЕТ,
  по явной команде, с `--execute`.
- Дублировать логику инвариантов вместо вызова `checkInvariants`.

### Тесты

| Область | Минимум |
|---------|---------|
| дубль id | отказ с внятным сообщением |
| контрабанда | derived с premisesUsed вне parents → отказ (ловится ядром) |
| висячий parent | отказ (I2 через ядро) |
| owner без utterance | warning, но не отказ |
| happy path | валидный токен проходит, дефолты проставлены |

### Definition of Done

- [ ] Дубль и контрабанда режутся до записи; happy path пишет и запускает verify.
- [ ] Dry-run по умолчанию; тесты зелёные; файл в `test:scripts`.
- [ ] LGTM Teamlead.

### Out of scope

- Правка/отзыв существующих токенов, редактор openGaps.
- Правка скилла кристаллизации (PR #575 открыт).

---

## Заметки для человека-постановщика

1. После merge — отчёт в #642; issue можно закрывать (пп.1–3 все реализованы).
2. Закрытие: `yarn task:archive truth-mint --notes "PR #…"`.

### Проверка после PR

```bash
yarn truth mint --file <token.json>          # dry-run
yarn truth mint --file <token.json> --execute
```
