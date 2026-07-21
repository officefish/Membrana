# dream-master — кит снов v2 (Мастер снов)

Второй жилец слоя [`kits/`](../README.md). Именованный набор для autonomous-прогона
тиков/дайджеста снов: CLI `dreams:*` + замыкание lib.

**Owner пина:** `dynin` (`leadPersona` в [`MANIFEST.json`](./MANIFEST.json)).  
**Автор текста снов:** «Мастер снов» / [`DREAM_MASTER_PROMPT.md`](../../docs/prompts/DREAM_MASTER_PROMPT.md)
(`DREAM_MASTER_VERSION` — не в pins, см. D1 → precedents процедуры в D3).  
**Эпик:** `kits-dream-master` (#855) · CLOSURE [`kits-dream-master-2026-07-21`](../../docs/day-sprint/kits-dream-master-2026-07-21/CLOSURE.md).

## Режимы

| Режим | Когда | Поведение |
|-------|--------|-----------|
| **latest** | интерактив | дерево может быть новее; `yarn kits:audit --id dream-master --mode latest` |
| **pinned** | cron / office / night без владельца | только от пина; `yarn kits:audit --id dream-master` |

Обновление пина — **отдельный** ревьюируемый коммит `MANIFEST.json`.

## Root

| Root | yarn |
|------|------|
| `scripts/dreams.mjs` | `dreams:tick`, `dreams:digest` |

Замыкание (~10 узлов) включает `lib/dreams-{select,tick,format,log}`, транзитивы
`lib/night-research.mjs` (enumeratePairs), `llm-probe`, `_anthropic-env`, … —
зависимости CLI, не продукт `yarn night:research`.

`scripts/lib/dreams-providers.mjs` сейчас не в статическом замыкании CLI (только
тесты) — в pins не входит; при подключении к runtime — обновить манифест.

## Аудит

```bash
yarn kits:audit --id dream-master
yarn kits:audit --id dream-master --mode latest
```

## Чеклист PINNED_SUBGRAPH (этот кит)

1. ✅ Единица версии — подграф в `MANIFEST.json` (`pins`).
2. ✅ Пины — git blob SHA; копий нет.
3. ✅ Аудит — `yarn kits:audit --id dream-master`.
4. ✅ Режимы latest/pinned — таблица выше.
5. ✅ Обновление пина — отдельный коммит манифеста.
6. ✅ Владелец пина — `leadPersona: dynin`.
7. ✅ Дрейф — табличный вывод audit.

## Процедура

[`docs/procedures/ritual-dreams/`](../../docs/procedures/ritual-dreams/) —
`kitVersion: kits/dream-master`; `engines[]` = `scripts/dreams.mjs`.

## Вне кита (D1)

Night Build · CLI `night:research` · Nest office dreams · `DREAM_MASTER_PROMPT.md`
(в `precedents[]` процедуры) · `docs/truth/registry.json` (data runtime).
