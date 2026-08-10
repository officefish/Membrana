# Приёмка #1814: опись дампа читается с диска — живой прогон 2026-08-10

> Блок b4 спринта `dump-inventory-from-archive` (держатель tarasov). Приёмка иссью
> дословно: `manifest.inventorySource === 'archive-contents'`, и опись сравнивается с
> фактическим содержимым артефакта, а не с текстом лога.

## Прогон (рунбук `deploy/archivarius-backup/README.md`, локальный proof-стенд)

| Шаг | Команда | Результат |
|---|---|---|
| стенд | `docker compose -f local-proof.compose.yml up -d` | `archivarius-dump-proof` healthy |
| сев | `--profile seed run --rm synthetic-seed` | `seeded spans=5000 runs=2` |
| дамп | `yarn backup:dump` (env: `ARCHIVARIUS_COMPOSE_FILES/MONGO_SERVICE/DUMP_DIR` на стенд) | exit 0, `mongo-dump--20260810T164532660Z--7.0.39--d6ca5b9b.archive.gz` · 48.5 КиБ · **5002 документа** |
| опись | `yarn backup:list` | ✔ пригоден |
| дрилл | `yarn backup:restore-drill` (через фасад дома, b2) | **«восстановление подтверждено: все коллекции сошлись по счёту, содержимому и инвариантам»**, exit 0 |
| уборка | `down -v` оба проекта | стенды и тома сняты, машина чиста |

## Манифест живого артефакта (дословно, ключевые поля)

```json
{
  "schemaVersion": 2,
  "mongoVersion": "7.0.39",
  "mongodumpExitCode": 0,
  "sha256": "d6ca5b9b9af10f5df8a457f6619f5e9d5ae19c186c7614de75f6b12c4d3ee3ba",
  "inventorySource": "archive-contents",
  "dbInventory": [
    { "db": "membrana_archivarius", "collection": "runs", "documentCount": 2 },
    { "db": "membrana_archivarius", "collection": "spans", "documentCount": 5000 }
  ],
  "protocolChecks": { "incompleteCollections": [] }
}
```

## Почему это закрывает долг

- **Источник — артефакт.** По пути описи видно сам механизм: тракт дампа поднял
  изолированную цель (`archivarius-restore-drill`, свой том), накатил в неё **свежезакрытый
  tmp-архив** (`5002 document(s) restored successfully`), снял листинг конвейером дома и
  погасил цель с томом. Регулярок по stderr в тракте описи нет.
- **Две независимые правды сошлись.** stderr mongodump (гард протокола) говорит
  `runs (2 documents)`, `spans (5000 documents)`; опись из содержимого архива — те же
  числа. Раньше вторая правда отсутствовала: опись БЫЛА пересказом первой.
- **Фильтр дисциплины работает.** `admin.system.version` есть в архиве (виден в stderr),
  но в опись не входит: конвейер снимает `membrana_archivarius` (`nsInclude DB_NAME.*`) —
  опись описывает предмет бэкапа, а не побочку утилиты.
- **Гард протокола жив отдельным полем**: `protocolChecks.incompleteCollections: []` —
  все начатые коллекции дописаны.
- **Откат подтверждён тем же конвейером** (дрилл через фасад b2): счёт, sha256 содержимого
  и инварианты сошлись по всем коллекциям.

## Границы вещдока

Прогон — на синтетике локального proof-стенда (канон #1809: «всё, что предшествует
прод-развёртыванию, проверяемо на локальном compose с тем же образом mongo:7»). Прод-жест
владельца — тот же глагол `yarn backup:dump` на VDS; тракт не отличается ничем, кроме env.
Артефакты прогона живут в `var/backups/archivarius-proof/` (вне git).
