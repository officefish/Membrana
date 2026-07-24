# One-shot rank — подбор кандидатов (не вердикт)

> Фаза V8 спринта tasks-workshop · Issue [#1064](https://github.com/officefish/Membrana/issues/1064) ·
> Linear [DRU-412](https://linear.app/techies68/issue/DRU-412) ·
> вердикт [`tasks-workshop-m5a-pick-2026-07-23.md`](../seanses/tasks-workshop-m5a-pick-2026-07-23.md).

## Контракт

```ts
rankOneShotCandidates(cards, options?) → {
  ok: true,
  candidates: RankedCandidate[],  // score ≥ 0.4, sorted desc
  excluded: { cardId, reasons[] }[],
  meta: { weights, maxSizeHours, scoreThreshold }
}
```

- **Не вердикт:** штамп S ставит тимлид (`yarn` / процедура one-shot).
- Чистая функция: [`scripts/lib/one-shot-rank.mjs`](../../scripts/lib/one-shot-rank.mjs).
- Предикат по диффу — соседний [`evaluateOneShotS`](../../scripts/lib/one-shot-s-predicate.mjs) (#1022).

### Жёсткие отсечки (до score)

| Условие | Результат |
|---------|-----------|
| `size` → часы > 5 (M/L) | `excluded` |
| `serverImpactClue = critical` | `excluded` |

### Score

`0.3·sizeNorm + 0.3·(1−serverRisk) + 0.2·scopeClarity + 0.2·historicalReputation`

Каждый источник несёт `dataReadiness ∈ {ready, pending, error}`.

История по умолчанию `pending` (след — фаза v9 / `one-shot-trail.jsonl`).

## CLI

```bash
yarn one-shot:rank              # active size=S
yarn one-shot:rank --all        # все active
yarn one-shot:rank <id> --json
yarn one-shot:rank --history path/to/stats.json
```

Оболочка: [`scripts/one-shot-rank.mjs`](../../scripts/one-shot-rank.mjs).

UI (`--ui`) — вне этого PR (DoD допускает отложить standalone HTML).
