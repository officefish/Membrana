# TARIFF_MATRIX — матрица тарифов Membrane Platform

> **Статус:** черновик v0.6 (2026-06-25). Продуктовая матрица на **3 тарифа**; технические id совпадают с seed в [`MEMBRANE_PLATFORM.md`](./MEMBRANE_PLATFORM.md).
>
> **Связанные документы:** [`INTEGRATIONS_STRATEGY.md`](./INTEGRATIONS_STRATEGY.md) §4 (каталог детекторов), [`DETECTOR_BENCHMARK.md`](./DETECTOR_BENCHMARK.md) (stage-gate), [`DATASET.md`](./DATASET.md) (корпуса каталогов).

---

## TL;DR

| Тариф | id | Для кого | Суть |
|-------|-----|----------|------|
| **Базовый** | `free-v1` | знакомство, поле без облака | DSP-детекция + live-журнал + каталог 120 сэмплов |
| **Инди** | `indie-v1` | активный оператор, paired-узел | MFCC + спектрограммы сэмплов, neural pack, каталог 600 |
| **Бизнес** | `business-v1` | команда / B2B | server inference, fine-tune, agentic review, каталог 3000 |

Тариф `state-v1` (12 000 сэмплов) **вынесен за рамки v1 матрицы** — отдельный контракт после stage-gate 1→2.

---

## Оси тарификации

Тариф задаёт **независимые оси** (не смешивать в одно поле):

| Ось | Поле `Tariff` | Что ограничивает |
|-----|---------------|------------------|
| **Хранилище** | `userStorageQuotaBytes` | Суммарный объём user-коллекций на сервере (paired) |
| **Буфер live** | `bufferQuotaBytes` | Ёмкость `__buffer__` per `deviceId` |
| **Системный каталог** | `datasetCatalogId` | Read-only корпус для калибровки и template-match (не байты) |
| **Детекция** | feature flags / plugin pack | Какие детекторы и режимы доступны в client |
| **Спектральный анализ** | feature flags | MFCC и спектрограммы по сэмплам (sample library / cabinet) |
| **Платформа** | лимиты узлов, ключей, журнала | Облачный cabinet, hot retention, архив журнала, export |
| **User workspace** | `maxUserWorkspaces` | Число **редактируемых** сценариев device-board на `deviceId` (слоты оператора; системный каталог **не** входит) |

В **автономном режиме** (`nodeConnectionMode: autonomous`) облачные квоты не enforced; bundled-каталог в client — минимум `free-v1-catalog` независимо от тарифа мембраны (см. [`MEMBRANE_PLATFORM.md`](./MEMBRANE_PLATFORM.md) §«Автономный режим»).

**User workspace (U10):** в **paired** режиме квота `maxUserWorkspaces` приходит из cabinet tariff (`/v1/pair`, `/v1/pair/status`); при отсутствии поля или в **autonomous** — fallback **3**. См. [`DEVICE_BOARD_CONCEPT.md`](../packages/device-board/DEVICE_BOARD_CONCEPT.md) §22.

### Server enforcement (STE v1 · paired)

| Слой | Поведение |
|------|-----------|
| **Cabinet `Tariff`** | Канон: `maxUserWorkspaces`, storage/buffer, `datasetCatalogId` |
| **Pair / re-pair** | Cabinet → `PATCH /v1/devices/:id/membrane` на media: snapshot лимитов на `Device` |
| **Media** | `PUT` **нового** `workspaceId` → **403** `WORKSPACE_QUOTA_EXCEEDED` при `count >= max`; `GET device-workspaces` → `userWorkspacesQuota` |
| **Client** | `resolveWorkspaceTariff()` — paired из pair; autonomous — local mirror **free-v1** (3); 403 → `used/max` |
| **Документ** | Client шлёт `device-scenario` **v2**; media принимает **v1–v2** |

Автономный режим: сервер **не** enforced; локальный тариф всегда минимальный **free-v1**.

---

## Матрица: платформа и хранилище

| Параметр | `free-v1` Базовый | `indie-v1` Инди | `business-v1` Бизнес |
|----------|-------------------|-----------------|----------------------|
| **Мембран на пользователя** | 1 | 1 | 1 → 3 (план) |
| **Узлов (Node) на мембрану** | 1 | 1 → 3 (план) | до 10 (план) |
| **Активных ключей на узел** | 1 | 2 | 5 |
| **userStorage** | **1 GiB** ✓ | **10 GiB** (черновик) | **50 GiB** (черновик) |
| **buffer (per device)** | **1 GiB** ✓ | **5 GiB** (черновик) | **20 GiB** (черновик) |
| **datasetCatalogId** | `free-v1-catalog` ✓ | `indie-v1-catalog` | `business-v1-catalog` |
| **Сэмплов в каталоге** | **120** ✓ | **600** (план) | **3000** (план) |
| **Pairing + cloud journal** | ✓ | ✓ | ✓ |
| **Cabinet: библиотека remote CRUD** | ✓ | ✓ | ✓ |
| **Cabinet: play + waveform** | ✓ (waveform) | ✓ + **спектрограмма** | ✓ + спектрограмма |
| **Спектральный анализ сэмплов** | — | ✓ **MFCC** + **спектрограмма** | ✓ |
| **Export журнала** | ✓ | ✓ | ✓ |
| **Hot retention** (записи в активном журнале) | **3 дня** | **10 дней** | **30 дней** |
| **Архив журнала** (после hot) | — | — | перенос после 30 дней, квота **40 GiB** |
| **Device-board user workspaces** (редактируемые слоты на узел) | **3** ✓ | **10** (план) | **25** (план) |
| **Цена (ориентир, v0.6)** | **0 ₽** | **790–990 ₽/мес** · **7 900 ₽/год** | **от 4 900 ₽/мес** · команда **от 12 900 ₽/мес** |

✓ — реализовано или зафиксировано в коде/seed. «Черновик» / «план» — продуктовый ориентир до MP billing.

### Цены (черновик v0.6, не billing)

| id | Модель | Ориентир | Примечание |
|----|--------|----------|------------|
| `free-v1` | Freemium | **0 ₽** | 1 node, hot 3 дня; lead-gen |
| `indie-v1` | Подписка | **790–990 ₽/мес** за мембрану | MFCC/спектр, 600 сэмплов, neural pack |
| `indie-v1` | Год | **7 900 ₽/год** (~−17%) | удержание операторов |
| `business-v1` | Контракт | **от 4 900 ₽/мес** (1 node) | archive 40 GiB, SLA |
| `business-v1` | Команда | **от 12 900 ₽/мес** | до 3 nodes / multi-key (план) |
| add-on | Server inference | **+2 000 ₽/мес** | когда появится `background-inference` sidecar |

Цена растёт **медленнее**, чем product-квоты (storage × catalog). Финальные цифры — LGTM Teamlead + billing sprint.

**Soft caps на shared platform VPS** (§«Platform capacity»): free до **100** paired мембран/инстанс; indie до **30**; business — **не** на shared 4 GB RAM.

### Облачный журнал: hot, архив, export

**Export** (выгрузка записей/отчётов из журнала) — **на всех тарифах сразу**, без апгрейда.

**Hot retention** — сколько дней запись остаётся в **активном** журнале cabinet/client (быстрый доступ, play, waveform). По истечении срока запись удаляется из hot-хранилища (free, indie) или становится кандидатом на перенос в архив (business).

| Тариф | Hot | После hot | Архив |
|-------|-----|-----------|-------|
| `free-v1` | 3 дня | удаление | нет |
| `indie-v1` | 10 дней | удаление | нет |
| `business-v1` | 30 дней | **перенос в архив** (вручную или по политике) | до **40 GiB** суммарно на мембрану |

На **business** архив — отдельный слой хранения: записи старше 30 дней в hot не пропадают, а переезжают в cold archive до исчерпания квоты 40 GiB. Export из архива — так же доступен, как из hot.

Техническое поле (план MP billing): `journalHotRetentionDays`, `journalArchiveQuotaBytes` (только `business-v1`).

---

## Матрица: детекция по звуку

Семейства и эшелоны — [`INTEGRATIONS_STRATEGY.md`](./INTEGRATIONS_STRATEGY.md). Stage-gate 1→2: precision ≥ 85%, recall ≥ 90% на test-split каталога тарифа.

### Пакеты детекторов

| Детектор / режим | Семейство | Эшелон | `free-v1` | `indie-v1` | `business-v1` |
|------------------|-----------|--------|-----------|------------|---------------|
| **Harmonic** | DSP | 0 browser | ✓ wired | ✓ | ✓ |
| **Cepstral** | DSP | 0 | ✓ wired | ✓ | ✓ |
| **Spectral flux** | DSP | 0 | ✓ wired | ✓ | ✓ |
| **Template-match** | DSP + trends | 0 | ✓ wired (bundled шаблоны) | ✓ + **свои шаблоны** | ✓ + командный каталог шаблонов |
| **Trends-FFT analyzer** (live / шаблоны) | DSP / визуал | 0 | ✓ | ✓ | ✓ |
| **MFCC-анализ сэмпла** | DSP | 0 | — | ✓ (план) | ✓ |
| **Спектрограмма сэмпла** | Визуал | 0 | — | ✓ (план) | ✓ |
| **YAMNet** | Neural | 0 | — | ✓ (после scaffold → prod) | ✓ |
| **CLAP zero-shot** | Neural | 0 | — | ✓ | ✓ |
| **Voice gate (VAD / Whisper)** | Pre-filter | 0–1 | — | ✓ | ✓ |
| **Calibrated ensemble** | Meta | 0 | — | ✓ (DSP + neural) | ✓ + server weights |
| **Agentic review (Claude)** | Agentic | 3 API | — | — | ✓ (спорные кейсы) |
| **PANNs / BEATs / AST** | Neural | 2 server | — | опция sidecar | ✓ `background-inference` |
| **Fine-tuned drone model** | Neural | 2 | — | — | ✓ на корпусе тарифа |
| **TDOA / мультиузел** | Fusion | — | ❌ frozen | ❌ frozen | ❌ до stage-gate |

### Режимы анализа в client

| Режим | `free-v1` | `indie-v1` | `business-v1` |
|-------|-----------|------------|---------------|
| **Sample library → анализ** (plugin `sample-library-drone-analysis`) | ✓ 4 DSP | ✓ DSP + neural pack | ✓ full pack |
| **Live mic → авто-анализ** (`mic-live-drone-analysis`) | ✓ DSP only | ✓ DSP + neural | ✓ + приоритет server |
| **Отчёт DDR** (таблица по кадрам) | ✓ | ✓ | ✓ |
| **Export журнала** | ✓ | ✓ | ✓ |
| **Запись в live-журнал** | ✓ (hot 3 дня) | ✓ (hot 10 дней) | ✓ (hot 30 дней → архив 40 GiB) |
| **Офлайн (autonomous)** | ✓ без cloud sync | ✓ | ✓ |

### Спектральный анализ сэмплов (indie+)

С **тарифа `indie-v1`** в sample library и cabinet (paired) доступны:

| Возможность | `free-v1` | `indie-v1` | `business-v1` |
|-------------|-----------|------------|---------------|
| **Waveform** (огибающая при play/scrub) | ✓ | ✓ | ✓ |
| **Спектрограмма** (log-mel / STFT heatmap по файлу) | — | ✓ | ✓ |
| **MFCC** (коэффициенты + сводка по кадрам/окнам) | — | ✓ | ✓ |
| **Привязка к отчёту DDR** (MFCC/спектр в detailed report) | — | ✓ (план) | ✓ |

На **free** остаётся только waveform и DSP-детекторы без расширенного спектрального UI. Реализация — analyzer-сервис поверх `@membrana/audio-engine-service` + плагин/панель в sample library (client и cabinet parity). См. [`DRONE_DETECTOR_DETAIL_REPORT_PROMPT.md`](./prompts/DRONE_DETECTOR_DETAIL_REPORT_PROMPT.md) (MFCC/спектрограммы вынесены за scope DDR в indie-тариф).

---

### Качество и позиционирование (честно)

| | `free-v1` | `indie-v1` | `business-v1` |
|---|-----------|------------|---------------|
| **Ожидаемая точность** | лаборатория; F1 DSP ~53–71% на free-v1 | целевой прирост за счёт neural + ensemble | максимум после fine-tune + server |
| **Обещание пользователю** | «сбор данных + базовая оценка» | «меньше ложных срабатываний» | «production-grade на вашем корпусе» |
| **Калибровка** | ручная на 120 сэмплах | авто-пороги на 600 | персональный fine-tune на 3000+ |

---

## Матрица: инфраструктура детекции

| Ресурс | `free-v1` | `indie-v1` | `business-v1` |
|--------|-----------|------------|---------------|
| **Где считается inference** | только CPU клиента | CPU/GPU клиента | клиент + **свой GPU-сервер** |
| **Стоимость для Membrana** | 0 | 0 (модели local) | хостинг GPU + опц. API-токены |
| **Лимит анализов / месяц** | без лимита (честный use) | без лимита | без лимита + SLA latency |
| **Benchmark / dataset sync** | `yarn benchmark:detectors` на free-v1 | + indie split | + business split |
| **Provision каталога при pair** | ✓ DS5 | план | план |

---

## Roadmap внедрения по тарифам

### Сейчас (`free-v1` — production)

- [x] Seed tariff: 1 GiB + 1 GiB + `free-v1-catalog`
- [x] 4 DSP в sample-library + live plugin
- [x] Cloud journal + cabinet viewer
- [ ] Event-driven UX (stop → analyze, clear buffer) — улучшает все тарифы

### Следующий релиз (`indie-v1`)

1. Корпус `indie-v1-catalog` (600 × 5 с) + provision
2. **Спектральный пакет:** MFCC-анализ + спектрограмма сэмпла (client + cabinet)
3. YAMNet + CLAP в browser, подключить в plugins
4. Calibrated ensemble + voice gate
5. Квоты и seed в `background-cabinet` prisma
6. UI cabinet: отображение tariff tier + feature badges

### После stage-gate (`business-v1`)

1. Корпус `business-v1-catalog` (3000)
2. `background-inference` (эшелон 2) — PANNs/BEATs
3. Fine-tune pipeline на tariff dataset
4. Agentic review для low-confidence кейсов
5. Multi-node, journal archive 40 GiB, hot→cold перенос

---

## Соответствие id ↔ маркетинг

| id (техн.) | Маркетинг (RU) | Маркетинг (EN) |
|------------|----------------|----------------|
| `free-v1` | Базовый | Free |
| `indie-v1` | Инди | Indie / Pro |
| `business-v1` | Бизнес | Business |

---

## Platform capacity & topology (v0.6)

> Prod-аудит 2026-06-25. Деплой: [`deploy/MEMBRANE_PLATFORM_DEPLOY.md`](./deploy/MEMBRANE_PLATFORM_DEPLOY.md) · media: [`BACKGROUND_MEDIA_DEPLOY.md`](./deploy/BACKGROUND_MEDIA_DEPLOY.md) §12.

### Целевая топология (2 VPS)

| VPS | Роль | Рекомендуемые specs | Сервисы |
|-----|------|---------------------|---------|
| **Platform** | paired data-plane + cabinet | **50 GB NVMe**, **4 GB RAM**, 2×5 GHz CPU, 200 Mbps | `background-media` + `background-cabinet` + 2× PostgreSQL |
| **Integrations** | RAG + Claude/Linear/GitHub | **≥14 GB** disk (legacy ok после миграции), **≥2 GB RAM** | `background-office` + LanceDB (`.membrana/rag/`) |

**Не смешивать** media blobs и office RAG на одном диске после split — build cache Docker на platform узле съедает место быстрее user data.

### Реальное потребление disk (free-v1, prod 2026-06)

| Компонент | На deviceId | На инстанс (fixed) |
|-----------|-------------|-------------------|
| Tariff catalog (120 × 5 s @ 48 kHz) | **~58 MB** provision | — |
| Buffer (типично) | **50–100 MB** | — |
| User collections (ранний этап) | **10–50 MB** | — |
| **Итого типично / free user** | **~150–250 MB** | — |
| Docker images + PG (media+cabinet) | — | **~3 GB** |
| Docker build cache (без prune) | — | **до 2.5 GB** — **не держать на prod** |

Blobs **не** главный потребитель на ранней стадии; **containerd/build cache** — да (см. deploy §10).

### Ёмкость platform VPS (50 GB NVMe, 4 GB RAM)

Резерв под OS + Docker (disciplined prune): **~8–10 GB** → **~40 GB** под blobs.

| Сценарий | Допущение | **Paired users (nodes)** |
|----------|-----------|--------------------------|
| **Тест / beta** | 100% free-v1, ~200 MB/user | **~150–200** |
| **Реалистичный mix** | 70% free 200 MB + 30% heavy 800 MB | **~100** |
| **Indie-heavy** | ~1 GB/user типично | **~35–40** |
| **Worst-case quota** | все max 2 GiB free | **~20** (нереалистично) |

**RAM (4 GB):** idle стек ~2–2.5 GB; одновременно активных mic/upload — планировать **10–20** без мониторинга; **50–80** paired free при редкой одновременности.

**Bandwidth 200 Mbps:** не bottleneck для gate-WAV upload.

### Soft caps (ops, до billing meter)

| Тариф | Shared platform instance | Dedicated tier trigger |
|-------|--------------------------|------------------------|
| `free-v1` | до **100** paired membranes | — |
| `indie-v1` | до **30** | NVMe **100 GB+** |
| `business-v1` | **не** на shared 4 GB | отдельный VPS / archive tier |

### Квота vs типичное (free-v1)

| | Технический max / device | Типично ранний prod |
|---|--------------------------|---------------------|
| userStorage + buffer | 2 GiB | 150–250 MB |
| Каталог | ~58 MB (не в userStorage quota) | provision once |

Indie/business черновики (10+5 GiB, 50+20 GiB) **не** рассчитаны на один shared 4 GB узел без tiering.

---

## Изменения документа

| Дата | Версия | Что изменилось |
|------|--------|----------------|
| 2026-06-16 | v0.1 | Первая матрица на 3 тарифа; `state-v1` вынесен за scope v1 |
| 2026-06-16 | v0.2 | Журнал: export всем; hot 3 / 10 / 30 дней; архив 40 GiB только business |
| 2026-06-16 | v0.3 | Спектральный пакет (MFCC + спектрограмма сэмпла) с `indie-v1` |
| 2026-06-23 | v0.4 | User workspace slots (`maxUserWorkspaces`): free **3** ✓; indie/business — план (U10 D1) |
| 2026-06-23 | v0.5 | STE v1: server enforcement workspace quota + v2 document on media PUT |
| 2026-06-25 | v0.6 | Platform capacity (2 VPS), pricing draft, soft caps; prod disk audit #178 |

*Вопросы по квотам и детекции — Teamlead; правки — через PR с обновлением seed только после согласования.*
