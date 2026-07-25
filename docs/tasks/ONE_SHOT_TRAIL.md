# One-shot trail — анти-дробление

> Фаза V9 спринта tasks-workshop · Issue [#1065](https://github.com/officefish/Membrana/issues/1065) ·
> Linear [DRU-413](https://linear.app/techies68/issue/DRU-413) ·
> вердикт [`tasks-workshop-m5b-chaining-2026-07-23.md`](../seanses/tasks-workshop-m5b-chaining-2026-07-23.md).

## Зачем

One-shot отменяет регистрацию карточки в `registry.json`, но след в коде остаётся.
Без отдельного журнала серия мелких шотов по одному карману невидима. Журнал —
**единственный** источник истории для подбора; реестр и лог независимы.

## Журнал

Файл: [`docs/audit/one-shot-trail.jsonl`](../audit/one-shot-trail.jsonl)

Строка (JSONL):

```json
{"timestamp":"2026-07-22T09:15:00.000Z","path":"docs/procedures/one-shot/x.md","slug":"fix-typo","headRev":"abc123","status":"merged"}
```

| Поле | Смысл |
|------|--------|
| `timestamp` | ISO8601 |
| `path` | основной путь артефакта |
| `slug` | короткий ярлык шота |
| `headRev` | SHA / ревизия |
| `status` | `merged` \| `cancelled` |

Идемпотентность: ключ `path|slug|headRev` — повтор `recordOneShot` не дублирует строку.

## Правила цепочки (M5B)

| Правило | Значение |
|---------|----------|
| Окно | 7 дней |
| Смежность | LCP **папок** ≥ 2 |
| Действие | ранг / score −1 уровень (`SCORE_LEVEL_STEP` в шкале score) |
| Override | `--override-one-shot-limit` → без штрафа, маркер `[risk-override]` |

## API

Чистые функции: [`scripts/lib/one-shot-trail.mjs`](../../scripts/lib/one-shot-trail.mjs)

- `loadShotHistory(records, pathOrPaths, { windowMs, now })`
- `applyOneShotPenalty(rank, shotCount)`
- `applyTrailScorePenalty(score, adjacentShotCount, riskOverride?)`
- `planRecordOneShot` / `recordOneShot` (idempotent)
- `checkShotHistory(text)` — CI-гейт (JSONL + non-decreasing timestamps)
- `historyStatsFromTrail(records)` → feed для `historicalReputation` в rank

Провод в подбор: [`rankOneShotCandidates`](../../scripts/lib/one-shot-rank.mjs) принимает
`options.trailRecords` и `options.riskOverride` (см. [`ONE_SHOT_RANK.md`](./ONE_SHOT_RANK.md)).

## CLI

```bash
yarn one-shot:trail check
yarn one-shot:trail ensure
yarn one-shot:trail record --path docs/… --head-rev <sha> [--slug s] [--status merged|cancelled]

yarn one-shot:rank                 # читает trail по умолчанию
yarn one-shot:rank --no-trail
yarn one-shot:rank --override-one-shot-limit
```

## Вне этого PR (follow-up)

- Полный пайплайн `scripts/one-shot.mjs` (запись после closure, до push) — когда появится оболочка.
- UI приказа утра (`morning-order` badge / popover) — отдельный срез; маркер уже в `reasoning` rank.
