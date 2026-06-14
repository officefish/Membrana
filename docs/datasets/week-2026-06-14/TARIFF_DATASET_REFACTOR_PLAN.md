# План рефакторинга: benchmark → tariff-dataset (2026-06-14)

> Координация PR по регламенту [`TASK_PROMPT_WORKFLOW.md`](../../prompts/TASK_PROMPT_WORKFLOW.md).  
> Эпик: [`TARIFF_DATASET_V1_EPIC_PROMPT.md`](../../prompts/TARIFF_DATASET_V1_EPIC_PROMPT.md).

## Статус фаз

| Фаза | Реестр | Ветка (предложение) | Статус | Примечание |
|------|--------|---------------------|--------|------------|
| DS1 Corpus | `tariff-dataset-ds1-corpus` | `feat/tariff-dataset-ds1-corpus` | **готово к PR** | 120 WAV, manifest v0.2, скрипты |
| DS2 Domain | `tariff-dataset-ds2-domain` | `feat/tariff-dataset-ds2-domain` | **готово к PR** | media-library + background-media |
| DS3 Client | `tariff-dataset-ds3-client-bundled` | `feat/tariff-dataset-ds3-client-bundled` | **готово к PR** | UI + `public/catalog/free-v1/` |
| DS4 Benchmark | `tariff-dataset-ds4-benchmark-v02` | `feat/tariff-dataset-ds4-benchmark-v02` | **готово к PR** | runner v0.2; полный прогон — после fix audio-engine build |
| DS5 Server | `tariff-dataset-ds5-server-provision` | `feat/tariff-dataset-ds5-server-provision` | **не начато** | provisioning при pair |

⚠️ Сейчас все изменения DS1–DS4 лежат **в одном рабочем дереве** на `feat/membrane-platform-mp4`. Перед PR — **разнести по веткам** по таблице файлов ниже.

---

## Разбиение файлов по PR

### PR-1 — DS1 Corpus (`tariff-dataset-ds1-corpus`)

```
package.json                          # dataset:fetch-real, dataset:sync-free-v1
scripts/fetch-real-dataset-collection.mjs
scripts/sync-free-v1-catalog.mjs
data/detectors-benchmark/v0.2/        # manifest + WAV + README
docs/DATASET.md                       # секция v0.2
docs/datasets/samples/real-collection/  # исходный корпус (или LFS)
docs/datasets/week-2026-06-14/collections-inventory.md  # если есть
.gitignore                            # .cache для fetch
```

**Не включать:** изменения в `packages/services/media-library`, `apps/client`.

**Проверка:**

```bash
yarn dataset:sync-free-v1
node -e "const m=require('./data/detectors-benchmark/v0.2/manifest.json'); console.log(m.samples.length)"
# ожидание: 120
```

**Отчёт в Issue #47:** «DS1: корпус free-v1, 120 samples, manifest v0.2».

---

### PR-2 — DS2 Domain (`tariff-dataset-ds2-domain`)

```
packages/services/media-library/src/constants.ts
packages/services/media-library/src/types.ts
packages/services/media-library/src/backends/memory-storage-backend.ts
packages/services/media-library/src/bundled-catalog.ts
packages/services/media-library/src/media-library-service.ts
packages/services/media-library/src/ports/storage-backend.ts
packages/services/media-library/src/index.ts
packages/services/media-library/test/media-library.test.ts
packages/background-media/src/lib/collection-ids.ts
packages/background-media/src/modules/collections/collections.service.ts
packages/background-media/src/modules/collections/collections.controller.ts
packages/background-media/src/modules/collections/collections.dto.ts
docs/MEDIA_LIBRARY_ARCHITECTURE.md
docs/MEMBRANE_PLATFORM.md
```

**Зависит от:** merge DS1 (manifest v0.2 для теста seed).

**Проверка:**

```bash
yarn workspace @membrana/media-library-service test
yarn workspace @membrana/media-library-service typecheck
```

**Отчёт:** «DS2: `__tariff_dataset__`, guards, bundled seed API, server ensureReserved».

---

### PR-3 — DS3 Client (`tariff-dataset-ds3-client-bundled`)

```
apps/client/public/catalog/free-v1/   # копия WAV (тяжёлый PR; LFS по решению Teamlead)
apps/client/src/modules/SampleLibraryModule.tsx
```

**Зависит от:** merge DS2.

**Проверка:** `yarn workspace @membrana/client dev` → библиотека → «Базовый набор (free-v1)» → 120 сэмплов, только чтение.

**Отчёт:** «DS3: bundled catalog в UI, автономный режим».

---

### PR-4 — DS4 Benchmark (`tariff-dataset-ds4-benchmark-v02`)

```
scripts/benchmark-detectors.mjs
docs/DETECTOR_BENCHMARK.md
```

**Зависит от:** merge DS1.

**Проверка:**

```bash
yarn benchmark:detectors
# ожидание: 120 samples, report в v0.2/reports/latest.json
```

**Отчёт:** «DS4: benchmark на free-v1 v0.2».

---

### PR-5 — DS5 Server (отдельная итерация)

- Endpoint или job: залить `free-v1-catalog` в `__tariff_dataset__` для `deviceId` при pair.
- Smoke: paired client видит те же 120 сэмплов с media-server.

---

## Ритм закрытия (на каждый PR)

1. Merge → CI green.
2. Комментарий в **Issue #47** (шаблон отчёта из [`TASK_CLOSURE_REGULATION.md`](../../prompts/TASK_CLOSURE_REGULATION.md)).
3. `yarn task:archive tariff-dataset-ds<N>-… --notes "PR #…"`.
4. Вечером (опционально): `yarn task:close-github` — только если заводили отдельные Issues на фазы.

---

## Что не входит в DS1–DS4

- Новые детекторы, stage-gate на полном корпусе (после недели W4–W5).
- User-коллекции и квоты (уже в MP4).
- Исправление `estree-walker` / `audio-engine` build (инфра CI, отдельный bug Issue).
