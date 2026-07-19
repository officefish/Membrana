# Промпт: транскрипт-поиск указателей правды + truth utterance / ask-check

> **Task-промпт для агента-разработчика.**
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **S**. Ожидаемый артефакт: **1 PR** — `scripts/lib/transcript.mjs`
> (поиск по всем трём местам) + подкоманды `truth utterance` и `truth ask-check`.
> Реестр: `id` = `truth-transcript-tooling` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Два issues — один корень. #595 п.1: трижды за сессию 17.07 поиск реплики владельца
фильтром `type === 'user'` объявил живую реплику несуществующей — реплики, присланные
посреди хода, лежат в `type: attachment` (`attachment.type: queued_command`), а клики
по вариантам — в `tool_result` внутри записи `type: user`. Агент едва не доложил «лаг
транскрипта». #642 п.3: ad-hoc node-скрипт для `uuid`+`timestamp` пишется на КАЖДЫЙ
владельческий токен (3+ раз за сессию). #642 п.1: сожжён вопрос владельцу №3 в
кристаллизации 18.07 — токен-ответ (`alex-sparring-answered`) был зачеканен ещё 17.07,
но фаза 0 прогнана формально и в сами токены никто не заглянул.

Проверенный факт (19.07, живые транскрипты): `attachment.prompt` бывает **строкой**
(21 случай) и **массивом** `{type:'text', text}` (50 случаев) — оба варианта обязательны.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| GitHub Issues #595 (п.1), #642 (пп.1, 3) | Эпизоды-evidence, эскизы |
| [`scripts/truth.mjs`](../../scripts/truth.mjs) | Обвязка графа правды — сюда подкоманды; НИЧЕГО НЕ ЧИНИТ САМ (запрет #533 сохраняется) |
| [`docs/truth/registry.json`](../truth/registry.json) | Токены (`claim`/`source.note`/`episode`) + `openGaps` — поле поиска ask-check |
| `.cursor/skills/membrana-truth-crystallization/` | Потребитель; правка скилла — ВНЕ scope (открыт PR #575) |

**GitHub Issues:** #595, #642.

---

## Промпт целиком (для вставки агенту)

### Что построить

1. `scripts/lib/transcript.mjs`:
   - `extractUtterances(record)` — из одной записи jsonl все владельческие тексты
     с их видом: `user` (content строка или text-блоки массива) ·
     `queued_command` (`attachment.prompt` строка ИЛИ массив `{text}`) ·
     `tool_result` (внутри `message.content` записи `type: user`).
   - `findUtterances(pattern, {dir})` — скан всех `*.jsonl` каталога →
     `[{sessionId, uuid, timestamp, kind, text, file}]`. Паттерн: подстрока
     (case-insensitive) или RegExp.
   - `rawScan(pattern, {dir})` — фолбэк сырой строкой по файлам (файл + номер
     строки), когда структурный поиск промахнулся.
   - `defaultTranscriptDir(cwd)` — `~/.claude/projects/<slug>` из cwd
     (слэши/двоеточия → дефисы; учесть оба регистра буквы диска).
2. `truth utterance "<фрагмент>" [--dir <path>] [--json]` — печатает `sessionId`,
   `uuid`, `timestamp`, `kind`, точную цитату. При промахе структурного поиска —
   автоматически `rawScan`; **любой** отрицательный ответ печатается вместе со
   способом поиска и его границей (какой каталог, сколько файлов, оба метода).
3. `truth ask-check "<вопрос>" [--json]` — дубль-проверка ДО вопроса владельцу:
   детерминированный поиск слов вопроса по `claim`/`source.note`/`episode` живых
   токенов и по `openGaps`. Выводит совпавшие токены (id, claim, status) и пробелы;
   явно печатает границу метода («поиск по словам, не по смыслу»). Exit 3, если
   найден живой токен-кандидат (сигнал «ответ уже есть — не жги вопрос»).

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Чистая lib | `scripts/lib/transcript.mjs` | Извлечение/поиск, без CLI и process.exit |
| CLI | `scripts/truth.mjs` | Подкоманды utterance / ask-check, вёрстка, exit-коды |
| Тесты | `scripts/transcript.test.mjs` | Все три места + оба формата prompt + rawScan-фолбэк + ask-check матчер |

**Запрещено:**

- Автопочинка реестра (`truth.mjs` ничего не чинит сам — ограничение сохраняется).
- Фильтр только по `type === 'user'` где бы то ни было.
- Правка скилла `membrana-truth-crystallization` (открыт PR #575) — follow-up после его merge.
- Новые контракты: форма токена — готовый канон (`insight-truth-tokens-owner-facts`).

### Тесты

| Область | Минимум |
|---------|---------|
| `extractUtterances` | user-строка; user-массив text; queued_command строка; queued_command массив; tool_result; чужие типы → пусто |
| `findUtterances` | находит во всех трёх местах на fixture-каталоге; промах → пустой массив (не исключение) |
| `rawScan` | ловит строку, которую структурный парс не достал (битый JSON) |
| ask-check матчер | вопрос со словами из claim живого токена → кандидат найден; слова только из archived → не найден |

### Definition of Done

- [ ] `yarn truth utterance "<живой фрагмент>"` находит реплику из текущей сессии, печатает uuid/timestamp/kind.
- [ ] `yarn truth ask-check "<вопрос про закрытый пробел>"` находит токен-ответ (регресс эпизода 18.07: alex-sparring-answered).
- [ ] Тесты зелёные, файл в `test:scripts`, coverage-гард зелёный.
- [ ] LGTM Teamlead.

### Out of scope

- `truth mint` (#642 п.2) — вторая итерация после utterance.
- Правка скилла кристаллизации (PR #575 открыт).
- Семантический (LLM) матчинг в ask-check — только детерминированные слова.

---

## Заметки для человека-постановщика

1. После merge — отчёты в #595 (п.1 закрыт, пп.2–4 остаются) и #642 (пп.1, 3 закрыты, п.2 остаётся).
2. Закрытие: `yarn task:archive truth-transcript-tooling --notes "PR #…"`.

### Проверка после PR

```bash
yarn truth utterance "идем по этому порядку"
yarn truth ask-check "ушла ли ласточка Алексу"
node --test scripts/transcript.test.mjs
```
