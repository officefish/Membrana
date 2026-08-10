# Приёмка #1814: опись дампа читается с диска — живой прогон 2026-08-10

> Блок b4 спринта `dump-inventory-from-archive` (держатель tarasov). Приёмка иссью
> дословно: `manifest.inventorySource === 'archive-contents'`, и опись сравнивается с
> фактическим содержимым артефакта, а не с текстом лога.

## Прогон (рунбук `deploy/archivarius-backup/README.md`, локальный proof-стенд)

| Шаг | Команда | Результат |
|---|---|---|
| стенд | `docker compose -f local-proof.compose.yml up -d` | `archivarius-dump-proof` healthy |
| сев | `--profile seed run --rm synthetic-seed` | `seeded spans=5000 runs=1` (перепрогон) |
| дамп | `yarn backup:dump` (env: `ARCHIVARIUS_COMPOSE_FILES/MONGO_SERVICE/DUMP_DIR` на стенд) | exit 0, `mongo-dump--20260810T182250954Z--7.0.39--e964400d.archive.gz` · 48.3 КиБ · **5001 документ** (перепрогон после ревью-фиксов: скоуп --db, свой проект цели archivarius-dump-inventory, listing-only) |
| опись | `yarn backup:list` | ✔ пригоден |
| дрилл | `yarn backup:restore-drill` (через фасад дома, b2) | **«восстановление подтверждено: все коллекции сошлись по счёту, содержимому и инвариантам»**, exit 0 |
| уборка | `down -v` оба проекта | стенды и тома сняты, машина чиста |

## Манифест живого артефакта (дословно, ключевые поля)

```json
{
  "schemaVersion": 2,
  "mongoVersion": "7.0.39",
  "mongodumpExitCode": 0,
  "sha256": "e964400d… (перепрогон 18:22Z)",
  "inventorySource": "archive-contents",
  "dbInventory": [
    { "db": "membrana_archivarius", "collection": "runs", "documentCount": 1 },
    { "db": "membrana_archivarius", "collection": "spans", "documentCount": 5000 }
  ],
  "protocolChecks": { "incompleteCollections": [] }
}
```

## Почему это закрывает долг

- **Источник — артефакт.** По пути описи виден сам механизм: тракт дампа с пре-клином
  поднял СВОЮ изолированную цель (`archivarius-dump-inventory`, свой том — не цель дрилла,
  ревью-фикс 10.08), накатил в неё **свежезакрытый tmp-архив**
  (`5001 document(s) restored successfully`), снял листинг конвейером дома (listing-only,
  без оплаты канонизации) и погасил цель с томом. Регулярок по stderr в тракте описи нет.
- **Две независимые правды сошлись.** stderr mongodump (гард протокола) говорит
  `runs (1 document)`, `spans (5000 documents)`; опись из содержимого архива — те же
  числа. Раньше вторая правда отсутствовала: опись БЫЛА пересказом первой.
- **Скоупы сведены к одному имени.** `mongodump --db membrana_archivarius` (ревью-фикс):
  дамп, опись и nsInclude отката держат один предмет — база архивариуса, не инстанс;
  манифест конструктивно не может недоописать артефакт.
- **Гард протокола жив отдельным полем**: `protocolChecks.incompleteCollections: []` —
  все начатые коллекции дописаны.
- **Откат подтверждён тем же конвейером** (дрилл через фасад b2): счёт, sha256 содержимого
  и инварианты сошлись по всем коллекциям.

## Границы вещдока

Прогон — на синтетике локального proof-стенда (канон #1809: «всё, что предшествует
прод-развёртыванию, проверяемо на локальном compose с тем же образом mongo:7»). Прод-жест
владельца — тот же глагол `yarn backup:dump` на VDS; тракт не отличается ничем, кроме env.
Артефакты прогона живут в `var/backups/archivarius-proof/` (вне git).
