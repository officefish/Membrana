# Промпт: Кусок D: /health/deep кабинета — числа вместо «ок»

> **Task-промпт для агента-разработчика.** Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **M**. Ожидаемый артефакт: **1 PR** — endpoint + gauges + калибровка + ретро-фикстура.
> Реестр: `id` = `obs-health-deep` · **GitHub Issue:** [#2121](https://github.com/officefish/Membrana/issues/2121)
> **Порядок:** после кусков B (#2119) и C (#2120) — ратифицированный DAG.

---

## Контекст

`/health` отвечал «ок» всю аварию 23.08 — он не касается зависимостей
(`health.controller.ts:33`). Несущий вердикт: [`m2-health-deep`](../seanses/logging-observability-cut-m2-health-deep-2026-08-24.md);
сводка и DoD: [`EPIC.md`](../meeting/logging-observability-cut/EPIC.md), кусок D.

## Промпт целиком (для вставки агенту)

### Что построить

1. `GET /health/deep` кабинета. Обязательные числа: `tape_length` (records),
   `db_latency_ms` (последняя проба), `ingest_arrived_ratio` ∈ [0,1]∪null (окно 900 с);
   плюс `status: ok|degraded`, явные warn/fail пороги, `measured_at`, `requestId`.
2. Пороги с физическим смыслом: db 1000/3000 мс; ratio 0,95/0,80; tape — из калибровки
   квадратичной стоимости C(N)≈αN² (протокол замера α записать рядом с контрактом).
3. Отказ — по контракту B: `genus`; `broken` → `incidentId` + `X-Incident-Id`.
   HTTP: 503 (busy/unreachable), 500|503 (broken), числа best-effort в теле.
4. Optional `duty_pulse` — словами куска C, без переименований.
5. Цена вызова: p99 ≤ 50 мс; источники — gauge с write-path / TTL-sample;
   запрет тяжёлого SQL/Θ(N²) на request-path.

### Definition of Done (7 предикатов вердикта M2)

- [ ] Схема контракта зафиксирована (величины, пороги, genus, optional duty_pulse).
- [ ] Request-path без квадратичных агрегатов; p99 ≤ 50 мс на стенде.
- [ ] **Ретро-предикат 23.08** — обязательная тест-фикстура: `tape_length ≥ 2400` или
      `db_latency_ms ≥ 3900` → ответ ≠ liveness-ok, числа в теле.
- [ ] Калибровка α и вычисленные `tape_length_warn/fail` записаны рядом с контрактом.
- [ ] `/health` не расширен; liveness-probe на deep не переведён.
- [ ] Сборщиков/экранов/деплоя в куске нет; `yarn turbo run …` зелёный (scope) · LGTM Teamlead.

### Out of scope

Prometheus/Grafana и экраны (Т1: не раньше живых издателей) · существо #2113/#2110 ·
прод-деплой без слова владельца.
