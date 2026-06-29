# Review: Server forwarding

> Virtual team · 2026-06-25

[Teamlead]: Архитектурно неизбежно для tier 2–3 INTEGRATIONS_STRATEGY и монетизации platform. **Adopted** как эпик platform+device-board; ветка `vesnin` для контрактов `ServerJobRef` / catalog server functions. Не смешать office Claude с audio RAG worker. Unified «AI credits» с scenario builder — отдельное решение после LGTM.

[Структурщик]: Канонический путь: palette node → client bridge (enqueue) → cabinet API → media blob + worker queue. Расширить async-v2 `StartAsyncJob` pattern, не N ad hoc nodes. Server function catalog = JSON manifest + tariff flags. Оценка **9**.

[Математик]: Tier 1 detectors остаются client; server — embed/RAG/heavy ML. Token debit idempotent by jobId. BYOK secrets только cabinet KMS. Оценка **7**.

[Музыкант]: Track → server interpret — логичное продолжение MakeTrack/upload; client не тянет CLAP weights. Bundled «basic interpret» на Pro — демо для оператора. Latency: async only, не блокировать main tick. Оценка **8**.

[Верстальщик]: Cabinet: integrations grid, token balance, job timeline. Canvas: server nodes с badge «Server · RAG» и tariff lock icon. Chain-log `server.job.*` для operator. Оценка **6** (cabinet UI scope).

## Голосование приоритета (1–10)

| Роль | Внедрять | Этап | /10 |
|------|----------|------|-----|
| Teamlead | да | квартал (platform epic) | 9 |
| Структурщик | да | квартал | 9 |
| Математик | да | квартал | 7 |
| Музыкант | да | месяц–квартал | 8 |
| Верстальщик | частично | квартал | 6 |

**Средний балл:** 7.8

## Резюме Teamlead

- Рекомендуемый статус: **adopted**
- Влияние на plan:week: weight **7.8**
- Следующий шаг: `SERVER_FORWARDING.md` contract sketch + manifest `server-functions/v1` + pilot `interpret-track-rag` после media+cabinet tariff hooks
