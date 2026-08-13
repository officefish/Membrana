# docs/archivarius — контейнер сессий

Archivarius (#1330, эпик #1229) — архивариус прожитых сессий Membrana. Источник
байтов — MongoDB в office-стеке; репозиторий — нотариус: держит контракт, мастерскую,
снимки и инструкции, но не становится базой полных сессий.

## Несущий контракт

Адресуемый отрезок — кристалл `session-archive-must-yield-addressable-span`:

```json
{ "sessionId": "…", "uuid": "…", "ts": "…" }
```

Минимальный адрес отрезка: `span://<sessionId>/<uuid>`. Архив обязан вернуть
отрезок по этому адресу.

Акт изъятия:

```http
GET /v1/archivarius/span/<sessionId>/<uuid>
```

Ответ:

```json
{ "bytes": "…", "sha256": "…" }
```

Ссылка — координаты. Вещдоком отрезок становится только после изъятия: копия байтов +
хеш + строка в индексе:

```bash
yarn evidence add <extracted-file> --id <slug> --source "Archivarius span extraction" --store archivarius --ref span://<sessionId>/<uuid>
```

См. `docs/evidence/README.md`: вещдок без хеша и адреса — не вещдок.

## Секретная граница

Веха `secret-parser-built` не закрыта, поэтому полные строки с секретными находками в
базу не кладутся. Ingest применяет существующий резак `scripts/lib/secret-redact.mjs`
построчно. Если строка содержит находку, Archivarius сохраняет маскированные байты и
метаданные `masked=true`, `maskedCuts[]`; отчёт ingest называет `maskedLines`.

Правило: честное `замаскировано N` лучше тихой утечки. Значения находок в индекс,
логи и README не попадают.

## Источники ingest

Ingest построчный и терпимый к формату; три харнеса читаются с полными
`sessionId/actor/ts` (форматы сняты с живых транскриптов 27.07):

| Харнес | Где лежит | Особенность формата |
|---|---|---|
| Claude Code | `~/.claude/projects/<slug>/*.jsonl` | `sessionId`/`uuid`/`timestamp` в каждой строке |
| Codex | `~/.codex/sessions/<Y>/<M>/<D>/rollout-*.jsonl` | конверт `{timestamp, type, payload}`: роль и вид — в `payload`; id треда объявляет `session_meta` (fallback — uuid в имени файла); голос владельца дублируется в `response_item/message` и `event_msg/user_message` |
| Cursor | `~/.cursor/projects/<slug>/agent-transcripts/<sessionId>/<sessionId>.jsonl` | `role` на записи; момент реплики — тег `<timestamp>` в тексте; sessionId — имя файла |

Формат транскриптов харнеса не «чинится» — читается как есть; незнакомые строки
получают детерминированный `uuid` и `actor=unknown`, а не отбрасываются.

## Команды

```bash
yarn archivarius ingest --from ~/.claude/projects --out docs/archivarius/cache/spans.jsonl
yarn archivarius ingest --from ~/.codex/sessions --out docs/archivarius/cache/spans.jsonl
yarn archivarius ingest --from ~/.cursor/projects/<slug>/agent-transcripts --out docs/archivarius/cache/spans.jsonl
yarn archivarius audit --index docs/archivarius/cache/spans.jsonl
yarn archivarius decompose --index docs/archivarius/cache/spans.jsonl --by sessions
yarn archivarius inspect <sessionId> --index docs/archivarius/cache/spans.jsonl
yarn archivarius search --index docs/archivarius/cache/spans.jsonl --text "needle" --actor user
```

`cache/` — рабочий локальный снимок и не источник правды. Серверный источник после
миграции — MongoDB office.

## Вечерний поток

С 13.08 (спринт `archivarius-evening-step`, фаза эпика #1330) сессии дня едут в
office **сами**: вечерняя цепочка несёт шаг `archivarius-evening`
(`docs/tasks/evening-ritual-steps.json`, после `deps-watch`, до `evening-tail` —
поздний слот захватывает больше сессий дня). До этого шага тракт запускался
только руками (вещдок 04.08: ручная заливка 106884 спанов).

```bash
yarn archivarius:evening   # тот же тракт scan→extract→ingest, но только файлы дня
```

Отличия от полного `yarn archivarius:push`:

- **фильтр дня** — в extract идут только файлы с mtime не старше начала дня;
  mtime — единственный источник (имена транскриптов — uuid, дат не несут);
- **health-предполёт** office до чтения корпуса;
- **словарь исходов закрыт**: `ok | office-unreachable | empty-day`; различение
  «сеть / ключа нет / ключ отвергнут» живёт в detail строки скипа, не в словаре;
- **отчёт — ровно одна строка счётчиков** `files/spans/maskedLines/accepted`;
  тела строк транскриптов в stdout не попадают (держится снапшот-тестом);
- `office-unreachable` — именованный скип (exit 3, `findingExitCodes` манифеста
  вечера): вечер не краснеет, сессии остаются на диске и доедут следующим прогоном;
  отказ батча после ретраев — настоящая ошибка (exit 1), partial молча не бывает.

Шаг цепочки — НЕ глагол мастерской: словарь `verbs` в `workshop.manifest.json`
закрыт (прецедент static-mmbrn M5), дом вечерней цепочки — её исполняемый манифест.
Контракт и спецификация спринта: `docs/prompts/ARCHIVARIUS_EVENING_STEP_PROMPT.md`.

## HTTP API office

Все маршруты требуют `X-Membrana-Token`.

| Метод | Путь | Назначение |
|---|---|---|
| `POST` | `/v1/archivarius/ingest` | принять батч уже маскированных span от CLI/оператора |
| `GET` | `/v1/archivarius/span/:sessionId/:uuid` | акт изъятия `{bytes, sha256}` |
| `GET` | `/v1/archivarius/audit` | полнота/битость индекса |
| `GET` | `/v1/archivarius/decompose?by=sessions|days|actors` | раскладка |
| `GET` | `/v1/archivarius/inspect/:sessionId` | паспорт сессии |
| `GET` | `/v1/archivarius/search` | полнотекст + фильтры `actor/from/to/replyType` |

Локально docker-compose поднимает `archivarius-mongo`. Прод-миграция office-стека и
перенос данных — отдельный шаг по слову владельца.

## Чеклист HOME_WORKSHOP

1. ✅ `workshop.manifest.json` с `pattern`/`name`/`worksOn`/`verbs`/`kit`.
2. ✅ `worksOn` — ровно `docs/archivarius`; паттерн указан ссылкой.
3. ✅ `audit` + `decompose` + `inspectElement` в этой мастерской.
4. ✅ Декомпозиция доменная: сессии, дни, акторы.
5. ✅ `kit: null`: первый слой без pinned kit, серверный набор выделится позже.
6. ✅ Доменный `search` несёт `worksOn`.
7. ✅ Отказы видимы: битый JSONL, sha mismatch, missing span и недоступный Mongo не
   считаются успехом.
8. ✅ Мастерская видна через manifest; после изменения запускать `yarn tooling:atlas --render`.
