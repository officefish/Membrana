# Эпик: Tariff Dataset v1 — убрать benchmark, единый free-v1 корпус

> **Стратегический task-эпик** (несколько PR, регламент [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)).  
> Размер: **L**. Родитель недели: [`REAL_DATASET_LIVE_CALIBRATION_WEEK_PROMPT.md`](./REAL_DATASET_LIVE_CALIBRATION_WEEK_PROMPT.md).  
> GitHub: [#47](https://github.com/officefish/Membrana/issues/47) (подэтап «инфраструктура датасета»).

---

## Решение Teamlead (2026-06-14, уточнение пользователя)

| Было | Стало |
|------|--------|
| Системная коллекция `benchmark` (`__system_benchmark__`) — пользователь наполняет для export | **Убрать** |
| Отдельный export в benchmark | **Один** read-only `tariff-dataset` (`__tariff_dataset__`) по тарифу |
| Синтетика v0.1 для stage-gate | **v0.2 free-v1** (120 × 5 с) — канон для UI, автономного узла и `yarn benchmark:detectors` |
| User-коллекции | Без изменений — по квоте тарифа |

**Free-тариф:** `free-v1-catalog` = 120 WAV (60 drone / 60 not-drone), доступен **без pairing** (bundled) и **после pairing** (provisioning на media-server — фаза DS5).

---

## Фазы и PR (один PR = одна запись реестра)

| Фаза | `id` реестра | Размер | Промпт | PR scope |
|------|--------------|--------|--------|----------|
| **DS1** | `tariff-dataset-ds1-corpus` | M | [`TARIFF_DATASET_DS1_CORPUS_PROMPT.md`](./TARIFF_DATASET_DS1_CORPUS_PROMPT.md) | Скрипты fetch/sync, `data/detectors-benchmark/v0.2/`, `docs/DATASET.md` |
| **DS2** | `tariff-dataset-ds2-domain` | M | [`TARIFF_DATASET_DS2_DOMAIN_PROMPT.md`](./TARIFF_DATASET_DS2_DOMAIN_PROMPT.md) | `@membrana/media-library-service`, `background-media` collections |
| **DS3** | `tariff-dataset-ds3-client-bundled` | M | [`TARIFF_DATASET_DS3_CLIENT_BUNDLED_PROMPT.md`](./TARIFF_DATASET_DS3_CLIENT_BUNDLED_PROMPT.md) | `public/catalog/free-v1/`, `SampleLibraryModule`, seed при `init()` |
| **DS4** | `tariff-dataset-ds4-benchmark-v02` | S | [`TARIFF_DATASET_DS4_BENCHMARK_V02_PROMPT.md`](./TARIFF_DATASET_DS4_BENCHMARK_V02_PROMPT.md) | `benchmark-detectors.mjs` → v0.2, `DETECTOR_BENCHMARK.md` |
| **DS5** | `tariff-dataset-ds5-server-provision` | M | [`TARIFF_DATASET_DS5_SERVER_PROVISION_PROMPT.md`](./TARIFF_DATASET_DS5_SERVER_PROVISION_PROMPT.md) | Provisioning каталога на `background-media` при pair |

**Порядок merge:** DS1 → DS2 → DS3 → DS4 (DS5 параллельно после DS2, не блокирует DS3/DS4).

**Закрытие фазы:** merge PR → отчёт в Issue #47 → `yarn task:archive <id> --notes "PR #…"`.

**Эпик `tariff-dataset-v1`:** архивировать после DS4 + DS5 (или DS5 в follow-up Issue).

---

## Связь с неделей W1–W5

- **DS1–DS4** закрывают инфраструктурный блок, который раньше в W3 предполагал `__system_benchmark__`.
- **W1–W2** (user-коллекции, анализ) — без изменений.
- **W3** в недельном промпте **обновлён**: курирование → `yarn dataset:sync-free-v1`, не ручной benchmark.
- **W4–W5** (live matching, journal) — после DS3.

План недели: [`docs/datasets/week-2026-06-14/TARIFF_DATASET_REFACTOR_PLAN.md`](../datasets/week-2026-06-14/TARIFF_DATASET_REFACTOR_PLAN.md).

---

## Definition of Done эпика

- [ ] Нет `__system_benchmark__` / `systemKey: benchmark` в коде и docs.
- [ ] Автономный client: коллекция «Базовый набор (free-v1)» с 120 сэмплами после `init()`.
- [ ] `yarn benchmark:detectors` читает v0.2 (120 test-split).
- [ ] Paired mode: DS5 provisioning (или явный defer в Issue с датой).
- [ ] Все фазы DS1–DS4 в архиве реестра.
