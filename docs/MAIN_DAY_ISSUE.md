<!-- Обновлено: 2026-06-26 (консилиум neural-detectors-strategy; позиция Teamlead) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Канон спринтов: docs/seanses/neural-detectors-strategy-2026-06-26.md -->
<!-- primaryFocus: device-board-three-hosts-2026-06-26 / db3h-s1-tech-debt -->
<!-- DEFERRED: neural-tier-1b-contract (после спринтов 1–4) -->

# MAIN_DAY_ISSUE — 2026-06-26

**Дата:** 2026-06-26 · **Хранитель:** Teamlead (Vesnin)  
**Пересмотр:** консилиум [`neural-detectors-strategy-2026-06-26`](./seanses/neural-detectors-strategy-2026-06-26.md)

---

## Единственный обязательный фокус

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  MAIN_DAY_ISSUE_2026_06_26 (пересмотр)                       │
│                                                              │
│  UserCase device-board стабилен на ТРЁХ интерфейсах:         │
│    • кабинет пользователя (web)                              │
│    • Membrana Studio (Electron)                              │
│    • Device Board (лёгкий desktop)                           │
│                                                              │
│  Сегодня / эта неделя: спринт 1 — техдолг + smoke трёх хостов │
│                                                              │
│  NeuralDetector / эшелон 1.B — DEFERRED (после спринтов 1–4) │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Очередь спринтов (магистраль)

| # | Epic ID | Фокус | Когда |
|---|---------|-------|-------|
| **1** | `db3h-s1-tech-debt` | lint, CI green, issues audit, test:scripts в CI, async L18–L19 | **сейчас** |
| **2** | `db3h-s2-cabinet-host` | device_board на сервере в кабинете | после 1 |
| **3** | `db3h-s3-studio-host` | device_board в Electron Membrana Studio | после 2 |
| **4** | `db3h-s4-microphone-detectors` | микрофон async + audit детекторов (template-match vs legacy DSP) | после 3 |
| **5** | `neural-tier-1b-contract` | `NeuralDetector`, YAMNet/CLAP skeleton, бенчмарк | **deferred** |
| **6** | `neural-free-tier-dataset-report` | датасет + трек → детектор → отчёт (free 1 ГБ library) | **неделя 2+** |

Umbrella: `device-board-three-hosts-2026-06-26` в [`docs/tasks/registry.json`](./tasks/registry.json).

---

## Критический путь (эта неделя)

1. **Утро — CI baseline (без RAG index)**
   ```bash
   yarn turbo run lint typecheck test build --continue
   yarn test:scripts
   yarn turbo run lint --filter=@membrana/device-board --force
   ```
   > RAG: только unit-тесты (`@membrana/rag-service test`), **не** `yarn rag:index --full`.

2. **Спринт 1 — техдолг** (`db3h-s1-tech-debt`, OPEN: `docs/day-sprint/db3h-s1-tech-debt-2026-06-26/`)
   - device-board lint: **0 warnings** ✅
   - Issues audit manifest + отчёт `docs/archive/github-issues-audit-2026-06-26.md`
   - `yarn test:scripts` green
   - Гигиена: не коммитить playwright-report, test-results, `.sync-readme-out.txt`

3. **Smoke UserCase на трёх хостах** (alpha/beta/gamma async-v2)
   - Кабинет: web-cabinet + scenario runtime
   - Studio: `yarn studio:dev` + host-bridge
   - Device Board: лёгкий Electron renderer

**DoD недели:** один UserCase JSON → одинаковый сценарий на cabinet / Studio / Device без расхождений runtime.

---

## Снято с магистрали (было в утреннем плане 26.06)

| Было | Статус |
|------|--------|
| A — `NeuralDetector` + CLAP сегодня | **deferred** → спринт 5 |
| B — удаление harmonic/cepstral/spectral-flux | **в спринт 4** (audit, не сегодня) |
| C — TransportService CONCEPT | **frozen** (stage 2) |
| D — TDOA skeleton | **frozen** (stage 2) |
| E — DETECTOR_BENCHMARK refresh | фоном в спринте 4 |

---

## Продуктовая цель (зафиксирована, не блокер недели)

На **free-тарифе** пользователь выжимает максимум из ~1 ГБ sample library:

**датасет + трек → детектор → отчёт**

Реализация после стабильных трёх хостов и спринта 4 — см. `neural-free-tier-dataset-report`.

---

## Definition of Done (конец недели)

- [ ] `db3h-s1-tech-debt`: RAG green или Issue; device-board tests green; L18–L20 stress
- [ ] Smoke UserCase async-v2 на cabinet + Studio + Device Board
- [ ] Спринт 2 стартован (cabinet deploy) или явно залогирован блокер
- [ ] `neural-tier-1b-contract` в registry со статусом deferred
- [ ] Вечерний ритуал: `yarn ritual:evening`

---

## Быстрая справка команд

```bash
# Диагностика
yarn turbo run test --filter=@membrana/rag-service --force
yarn lint --filter=@membrana/device-board
yarn usercase:verify-layout

# Device-board
yarn turbo run typecheck test --filter=@membrana/device-board

# Studio (когда хост готов)
yarn studio:dev

# Реестр
yarn task:list
yarn task:sync-readme
```

---

## Связь со стратегией

- **Консилиум:** [`docs/seanses/neural-detectors-strategy-2026-06-26.md`](./seanses/neural-detectors-strategy-2026-06-26.md)
- **Desktop line:** [`docs/seanses/desktop-product-line-2026-06-17-2026-06-17.md`](./seanses/desktop-product-line-2026-06-17-2026-06-17.md)
- **Нейро (отложено):** [`docs/INTEGRATIONS_STRATEGY.md`](./INTEGRATIONS_STRATEGY.md) §4.1
- **Stage-gate:** DRONE_TIGHT P 85.5% / R 88.3% — нейро после платформенной стабилизации

---

**Статус:** READY — фокус на три хоста + техдолг  
**Координатор:** Vesnin (Teamlead)  
**Опубликовано:** 2026-06-26 (пересмотр после консилиума)
