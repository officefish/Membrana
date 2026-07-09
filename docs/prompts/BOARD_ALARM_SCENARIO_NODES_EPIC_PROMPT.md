# Промпт (эпик): узлы полного детекционного сценария борда — N1–N5

> **Task-промпт для агента-разработчика.** Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **L** (эпик, 5 карточек = 5 PR). GitHub Issue: **#323**.
> Реестр: эпик `board-alarm-scenario-nodes`, карточки `basn-1…basn-5`.
> Подготовительный спринт перед **соревнованием** по сборке графа (формат
> device-board-hackathon / comp-packaging — см. `membrana-competition-packaging`).

---

## Контекст

Целевой сценарий (владелец, 2026-07-09): аудиопоток → анализ **двумя** детекторами →
fusion (`combinedScore`) → запись трека → упаковка двух отчётов + трека в **единый** отчёт →
при детекции переход в **alarm-loop**, работающий до потери «дистанции» (proximity `lost`);
отчёты и трек создаются **асинхронно**, не блокируя рантайм.

Инвентаризация палитры (v0.4–v0.9 + AP v1) показала: поток, трек, trends-анализ, отчёты,
async-оркестрация (start-async-job/await-promise/on-async-resolved/cancel-async-jobs,
job kinds `track-upload`/`report-build`/`journal-publish`) и управление (sequence,
loop-repeat, is-valid, variables, subgraph) — **есть**. Не хватает ровно пяти узлов.

**Опоры (уже в main):**
- `fuseDetectorConfidences` — fusion-ядро в `@membrana/core` (PR #288)
- `@membrana/detection-ensemble-service` — `EnsembleProducer` + DSP-детекторы (PR #317)
- `LoudnessTrendTracker` / `evaluateProximityAlarm` — `@membrana/fft-analyzer-service`
- async pipeline db-ap-r\* — узлы, executors, `AsyncJobStore`, detached dispatch

**Связанные документы:** `packages/device-board/DEVICE_BOARD_CONCEPT.md` (§5 сокеты,
§15.7 конструкторы make-\*, §16 таксономия), `packages/core/src/contracts/device-board/scenario-node-kind.ts`,
`packages/device-board/src/runtime/host.ts`, `apps/client/src/modules/device-board/createScenarioRuntimeHost.ts`.

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор виртуальной команды Membrana под Vesnin. Ведёт **Структурщик (Ozhegov)** —
контракты core + палитра; **Математик (Dynin)** — fusion/proximity; **Музыкант (Kuryokhin)** —
host-мосты аудио; **Верстальщик (Rodchenko)** — пины/инспектор.

### Архитектурные инварианты (все карточки)

1. **device-board зависит только от core** (`check:boundaries`). Сервисы
   (detection-ensemble, fft-analyzer) — ТОЛЬКО через host-мост: расширение
   `ScenarioRuntimeHost` + реализация в `createScenarioRuntimeHost` (клиент).
2. Узлы **stateless** — состояние (трекеры, аккумуляторы) в host-store per `runId`;
   teardown при stop/disconnect.
3. Каждый узел: kind в core (`scenario-node-kind.ts` + категория-массив) → пины/фабрика
   в `device-board/src/graph/` → executor в `runtime/block-executor` → палитра
   (`V04_PALETTE_NODE_KINDS`) → inspector-notes → unit-тесты (graph + executor) →
   при host-мосте: метод host + клиентская реализация + тест.
4. Никаких новых loop-узлов: alarm-loop = композиция `branch-on-detection` →
   `make-proximity-trend` → branch по `lost` → существующий `loop-repeat`.
5. Тяжёлая работа — async job (`report-build` и т.п.), рантайм не блокируется.
6. Сериализация: новые kind попадают в document schema без миграции старых сценариев
   (новые узлы опциональны); `LEGACY_*`-алиасы не трогаем.

### Карточки

#### basn-1 · N1 `make-ensemble-analysis` (M)
Второй детектор. Data-in: `AudioSampleRef`-окно (или FftFrameRefList — согласовать с
make-fft-trends-analysis), policy-опции на узле (детекторы, веса, smoothing).
Data-out: `EnsembleAnalysisRef` (новый SocketType). Host: `makeEnsembleAnalysis(window, opts)
→ { perDetector: {name, family, confidence, isDrone}[], combinedScore, agreement }` —
клиент реализует через `EnsembleProducer` (инъекция DSP-детекторов, как в
mic-combined-detection). Unit: executor с мок-host; клиентский host-тест с мок-детекторами.

#### basn-2 · N2 `make-detection-fusion` (S)
Fusion. Data-in: 2+ анализов (`FftTrendAnalysisRef` | `EnsembleAnalysisRef` — маппинг
в `FusionSourceInput` с family/confidence). Data-out: `FusionRef {combinedScore, agreement,
presentCount}`. Чистый вызов `fuseDetectorConfidences` из core — host НЕ нужен.
Молчащий вход (invalid ref) → present:false. Unit: согласие/расхождение/молчащий.

#### basn-3 · N3 `branch-on-detection` (S)
Exec-ветвление. Data-in: `FusionRef` (или анализ с confidence), `threshold` на узле
(0..1, default 0.5). Exec-out: `detected` / `not-detected`. Чистый. Unit: порог/грань/invalid-ref
(→ not-detected, не throw).

#### basn-4 · N4 `make-proximity-trend` (M)
«Дистанция». Data-in: окно/уровень (согласовать с collect-\*), `FusionRef` (score-гейт).
Data-out: `ProximityRef {trend: 'approaching'|'receding'|'stable'|'lost', ready}`.
`lost` = трекер потерял уверенность (score < порога N итераций — параметры на узле).
Host: `evaluateProximityTrend(runId, nodeId, input) → ProximityState` — клиент держит
`LoudnessTrendTracker` per (runId,nodeId) в host-store, teardown на stop. Unit: host-store
lifecycle + executor; выходное условие alarm-loop (branch по lost) — интеграционный smoke.

#### basn-5 · N5 `make-combined-report` (M)
Упаковка. Data-in: `ReporterRef`, анализы (2+), `TrackRef`. Data-out: `ReportRef`
(единый combined-отчёт: per-detector вердикты + combinedScore + ссылка на трек).
Тяжёлая сборка — async job kind `report-build` (существующий канал); публикация —
существующим `publish-report`. Unit: executor + host-мост сборки; async-путь не блокирует
main loop (тест по образцу async-pipeline-observability).

### Definition of Done (эпик)

- [ ] Все 5 узлов в палитре, с пинами, инспектором, executors, host-мостами и тестами.
- [ ] **Smoke полного сценария**: граф поток → trends + ensemble → fusion → branch →
      [detected: старт записи → трек → combined-report (async) → alarm-loop c proximity
      до `lost`] собирается из палитры и проходит end-to-end (vitest, мок-host).
- [ ] Рантайм не блокируется: отчёты/трек через async jobs (проверка наблюдаемостью chain-log).
- [ ] `check:boundaries` + `verify:wire-sync` + typecheck/test core, device-board, client зелёные.
- [ ] LGTM Teamlead = **gate соревнования**.

### Out of scope

- Само соревнование и упаковка UserCase-графа (следующий шаг, Задача 2 плана дня).
- Нейро-детектор (yamnet) как узел — после model-provider; N1 покрывает «второй детектор» DSP-ансамблем.
- Изменения кабинета/сервера; wire-контракт не трогаем.
- Новые loop-примитивы.

### Порядок работы

basn-2 → basn-3 (чистые, S — контрактный фундамент FusionRef) → basn-1 (host-мост) →
basn-4 (host-store lifecycle) → basn-5 (async упаковка) → эпик-smoke.

---

## Заметки для постановщика

1. GitHub Issue эпика: #323 (чекбоксы карточек там).
2. Карточки в registry: эпик `board-alarm-scenario-nodes` + `basn-1…basn-5` (этот промпт общий).
3. Закрытие карточки: PR → closure-review → `yarn task:archive <id>`; эпик — после smoke + LGTM.

### Проверка после каждого PR

```bash
yarn turbo run lint typecheck test --filter=@membrana/core --filter=@membrana/device-board --filter=@membrana/client
yarn check:boundaries && yarn verify:wire-sync
```

---

## Связь с дорожной картой

- WHITE_PAPER §3.3/§4.4 (fusion), §4.6 (ситуационный слой/раннее предупреждение).
- S2 FREE: combined+alarm UserCase (Задача 2 плана 09.07) собирается на этих узлах.
- Формат соревнования: `membrana-competition-packaging`, эпики device-board-hackathon.
