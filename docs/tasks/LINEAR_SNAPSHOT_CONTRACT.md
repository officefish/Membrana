# Контракт `linear-snapshot@1` (media-NL)

> Канон: вердикт M3 / К3 заседания [`linear-egress-gear-wiring`](../meeting/linear-egress-gear-wiring/)  
> Паспорт движка: [`LINEAR_TASKS_GEAR.md`](./LINEAR_TASKS_GEAR.md) §6  
> Код: `packages/background-media/src/linear-snapshot/` · офлайн: `scripts/lib/snapshot-contract.mjs`

## Производитель и потребитель

| Роль | Узел | Делает |
|---|---|---|
| Producer | **media-NL** | GraphQL `api.linear.app` + `batch-full-pull` → артефакт |
| Trigger | office (MSK) | `POST /v1/linear-snapshots/capture` с `X-Membrana-Token` |
| Consumer | office / скрипты гейтов | читают файл снимка офлайн |

Ключ `LINEAR_API_KEY` живёт **только** в env media. В запросе office→media ключ не передаётся.

## Honest-шапка (обязательные поля)

| Поле | Значение / смысл |
|---|---|
| `format` | `linear-snapshot@1` |
| `capturedAt` | UTC ISO, часы производителя (media) |
| `sourceRevision` | непустой курсор источника (`organization.updatedAt`) |
| `producedBy` | `media-NL` |
| `egressRegion` | `NL` |
| `mode` | `batch-full-pull` |
| `trigger` | `webhook` \| `evening-signal` \| `manual` \| `office-trigger` |
| `recordCount` | целое ≥ 0, **равно** `records.length` |

Опционально в `@1` (не гейт): `contentDigest`, `keyFingerprint`.

**Запрещено:** поле `source: 'office-batch'` — заменено парой `producedBy` + `mode` (M3).

## Предикат `pullOk(S)`

Чистая булева функция **только от файла** (сеть и `Date.now()` запрещены в теле):

```
pullOk(S) := hasFullHeader(H)
  ∧ H.producedBy = 'media-NL'
  ∧ H.egressRegion = 'NL'
  ∧ H.sourceRevision ≠ ∅
  ∧ H.mode = 'batch-full-pull'
  ∧ H.recordCount = |B|
```

Реализации: `pullOk` в media (`pull-ok.ts`) и в `scripts/lib/snapshot-contract.mjs`.

## Freshness (вне гейта)

`fresh := sourceCursor == header.sourceRevision` — отдельный дешёвый запрос курсора, **не** входит в `pullOk`. Код мягкого устаревания: `10` (`SNAPSHOT_STALE`).

## HTTP trigger (office → media)

```
POST /v1/linear-snapshots/capture
Header: X-Membrana-Token: <API_INTERNAL_TOKEN>
Body: { "trigger": "office-trigger", "persist": true }
→ { snapshot, pullOk, filePath }
```

## Out of scope этого контракта `@1`

- Stub-lift (`movementMode`, К5)
- Closure-гейт сверх `pullOk` (К4b)
- Обязательный `contentDigest`
