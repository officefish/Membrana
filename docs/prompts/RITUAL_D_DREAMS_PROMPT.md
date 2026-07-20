# Промпт: сны v2 (компонент D эпика ritual-refactor)

> **Task-промпт.** Размер: **L** (полный контур — сервис `@membrana/dreams`; здесь **ядро**
> соревнования + failover, отдельным проходом — стор/инфра/доставка). Реестр: `ritual-d-dreams`.
> Дизайн: заседание M5 ([`ritual-refactor-m5-dreams-2026-07-20.md`](../seanses/ritual-refactor-m5-dreams-2026-07-20.md)).
> DAG: `A → K → {S → R → D}`; A, K, S, R в main. D — последний.

## Что построить (это ядро)

1. **`select: Dream[24] → Winner[6]`** — детерминированная тотальная функция. 24 сна/сутки
   бьются **соседними четвёрками** (`heatOf(hour)=hour//4`) → 6 заездов. Победитель заезда —
   синтезированный сон с макс `score` (судья — LLM снаружи; здесь score сравнивают). Пустой
   заезд → `no-winner` явно (анти-«молчун»).
2. **Failover-кубик** `providerChain(seed)` / `rollProvider(seed, attempt)` — воспроизводимая
   перестановка 4 провайдеров (Perplexity/DeepSeek/Grok/Gemini); исчерпание → `null` = `synthesisFailed`.
3. **`digest(dreams)`** — победители (derived), при пустых заездах честно `<6` без добивки.

## Контракт

| Слой | Путь |
|------|------|
| Ядро | `scripts/lib/dreams-select.mjs` — select/digest/heatOf/providerChain/rollProvider |
| Тесты | `scripts/dreams-select.test.mjs` — без сети/моков |

**Инварианты (M5):** `select` детерминирована и тотальна (`no-winner` явно); `providerChain`
— биекция 4 провайдеров, воспроизводима по seed; `digest` `<6` честно; синтез ≠ дайджест
(дайджест — derived-проекция).

**Следующим проходом (L, вне этого PR):** сервис `@membrana/dreams` — append-only стор
(единственный писатель, 24 лежат все), автор «Мастер снов» (версия=промпт), server-first
office cron 24/сутки, доставка 6 победителей, media-прокси для провайдеров.

## Definition of Done

- [ ] `select`/`digest`/`heatOf`/`providerChain`/`rollProvider` чистые, детерминированные; тесты.
- [ ] `yarn test:scripts` зелёный; Teamlead LGTM.

## Движок задач

Linear (доступен через медиа-сервер): сценарий D, делегат — исполнитель.
