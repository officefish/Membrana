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
| `status` | `merged` \| `cancelled` \| `open` (запись при штампе S, до исхода) |
| `executor?` | кто играл шот (personaId, вердикт M2) |
| `forecast?` | обещание штампа S: `{files, lines}` |
| `actual?` | факт из диффа мердж-коммита: `{files, lines}`; нет мерджа → поля **нет** (не ноль) |

Новые поля опциональны — записи до #1844 валидны как есть; кривая форма поля
делает запись невалидной для `check`. Идемпотентность: ключ `path|slug|headRev` —
повтор `recordOneShot` не дублирует строку. Факт **не пишется руками**: только
`--merge <sha>` → `git diff --shortstat <sha>^1 <sha>` (расчёт в `scripts/`,
инсайт [`insight-one-shot-portfolio-surfacing`](../insights/insight-one-shot-portfolio-surfacing/INSIGHT.md)).

`open`-запись закрывается более поздней записью `merged`/`cancelled` той же пары
`path|slug`; анти-цепочка и `historyStatsFromTrail` открытые записи не считают
(не исход).

## Сверка форкастов — да/нет, без скоринга

`forecastHolds(forecast, actual)`: держится, если `actual.files ≤ forecast.files`
**и** `actual.lines ≤ forecast.lines`; нет любого из двух — `null`, не `false`.
Скоринг — второй шаг, после ≥2–3 недель статистики (скоуп-ограничение review 7.2).

## `brief` — сводка портфеля (5 строк)

Формат согласован тройным актом Тарасова —
[`oneshot-trail-brief-format-tarasov.md`](../discussions/oneshot-trail-brief-format-tarasov.md)
(in-flight в строке 1; «без executor»; явные знаменатели B/A и C/B). Всегда одни
поля, один порядок; окно 7 суток = окну анти-цепочки (двух окон не заводим);
тощий портфель печатает те же 5 строк с нулями, не молчит:

```text
шоты 7д: N (merged X · cancelled Y · in-flight Z) · лента всего M
зоны 7д: K — top-3 семейств (счёт)
исполнители 7д: top-3 (счёт) · без executor W
форкасты 7д: с форкастом A/N · факт есть B/A · держатся C/B
покрытие ленты: executor E/M · forecast F/M · actual G/M
```

Шот в окне — группа записей `path|slug` (open + закрывающая считаются одним шотом).

### Дисциплина всплытия — руками, через глаза

Сводка **вкладывается руками** ровно в две точки решения:

1. **Тройной акт Тарасова** — в текст вопроса, до вердикта (опора Т1 — ротация
   исполнителей — и сверка штампа S счётом, а не памятью судьи).
2. **Предложение кандидатов владельцу** — рядом с выдачей `one-shot:rank`.

В **утренний ритуал и хендоф сводка НЕ вкладывается**: пока на столе нет шота,
она — шум; прибор, говорящий без повода, перестают слышать. Автоматическая
отправка сводок куда-либо **запрещена** (скоуп мандата #1844).

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
- `normalizeShotVolume` / `parseDiffShortstat` / `forecastHolds` — форкаст↔факт
- `buildTrailBrief(records, { now, windowMs })` → ровно 5 строк сводки

Провод в подбор: [`rankOneShotCandidates`](../../scripts/lib/one-shot-rank.mjs) принимает
`options.trailRecords` и `options.riskOverride` (см. [`ONE_SHOT_RANK.md`](./ONE_SHOT_RANK.md)).

## CLI

```bash
yarn one-shot:trail check
yarn one-shot:trail ensure
yarn one-shot:trail brief          # 5 строк, формат согласован актом Тарасова
yarn one-shot:trail record --path docs/… --head-rev <sha> [--slug s] \
  [--status merged|cancelled|open] [--executor persona] \
  [--forecast-files N --forecast-lines N] [--merge <mergeSha>]

yarn one-shot:rank                 # читает trail по умолчанию
yarn one-shot:rank --no-trail
yarn one-shot:rank --override-one-shot-limit
```

`--merge` совместим только со `status merged`; сбой чтения диффа оставляет запись
без `actual` и говорит об этом в stderr.

## Вне этого PR (follow-up)

- Полный пайплайн `scripts/one-shot.mjs` (запись после closure, до push) — когда появится оболочка.
- UI приказа утра (`morning-order` badge / popover) — отдельный срез; маркер уже в `reasoning` rank.
