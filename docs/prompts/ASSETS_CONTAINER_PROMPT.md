# Промпт: Эпик контейнер имущества (#959)

> L · epic · id `assets-container` · lead vesnin, support ozhegov.
> Канон — заседание [`VERDICT.md`](../meeting/assets-container/VERDICT.md) (ратифицировано 22.07). Фазы И1–И5, повестка/вердикт там; вход — конспект мостика.
> Перерезка 23.08: [`assets-container.json`](../sprint/cut/assets-container.json) — имущество является доменным слоем поверх контракта оригиналов `static.mmbrn.tech`, а не вторым storage/access-контейнером.

## Ратифицированная пере-нарезка 23.08

Снято как покрытое контрактом оригиналов:

- immutable index/bytes/history: `EvidenceRecord.id`, `sha256`, `bytes`, append-only `registry.jsonl`, `supersedes`, derived `canonicalRef`;
- sensitive access: Panel как единственный авторизатор, proxy/API per action, fail-closed unknown/unavailable;
- storage classes и живучесть: `standard/sensitive`, overwrite ban, independent failure domains, backup/restore, retention/deletion lifecycle;
- самостоятельный cutover до готовности хозяина `static.mmbrn.tech`.

Остаётся собственным для имущества:

- доменная схема: актив, чек, набор, holder, photo today, `confirmedDate`, `status`;
- набор = активы общего `receiptId`; пин набора = чек; дрейф факт-к-чеку является находкой аудита;
- инструменты `assets add`, `assets confirm`, `assets audit`, `assets sync` как доменные adapters поверх общего intake/access/storage;
- зубы: без чека нет набора; holder обязателен; `confirm` ставит сегодняшнюю дату только при фото сегодняшним числом; RT-9 свежесть не смешивается с storage readiness;
- полевая приёмка Scarlett Solo: чек + фото сегодняшним числом + держатель по природе.

## Границы

Имущество не заводит собственный авторизатор: требование владельца "чувствительное — в сервер-БД за API" совместимо с R3/R4 только как Panel-authorized API/storage route. Расхождение начинается, если assets-БД сама решает доступ мимо Panel или мутирует sensitive record overwrite-ом вместо append-only истории.

Готовность хозяина остаётся внешним gate: R7 оригиналов держит cutover `NO-GO` до PASS readiness gates. Владелец отдельно решает, ждёт ли assets-container готовности оригиналов или стартует как domain-layer без storage/cutover.
