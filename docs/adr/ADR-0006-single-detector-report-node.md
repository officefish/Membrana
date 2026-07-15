# ADR-0006 — Отчёт одиночного детектора: расширить make-report-from-analysis, не вводить новый узел

> **Статус:** DRAFT · 2026-07-15
> **merge файла ≠ принятие решения** пока статус DRAFT — решения действуют после LGTM владельца.

## Контекст

Задача **PC-1** спринта `palette-clarity-nodes` (#493), из консилиума
`palette-nodes-free-clarity-2026-07-15` (СТ-2). Коворк #487 собрал
`usercase-free-neuro-detection` декомпозицией combined; нейро-одиночка вынужден
носить узел `MakeCombinedReport` — «combined»-отчёт при ОДНОЙ модальности (ложь
холста для FREE-витрины, по которой пользователь учится).

Консилиум дал развилку **вес ADR** (не полный консилиум, т.к. новый узел не
вводим — это был бы вариант B и консилиум-гейт):
- **A. Расширить `make-report-from-analysis`** до обобщённого `DetectionAnalysisRef`.
- **B. Новый узел `make-detection-report`** (+1 вид палитры → консилиум-гейт, миграция).

Этот ADR фиксирует выбор **A** и грунтует его наблюдаемым состоянием рантайма.

## Наблюдаемое состояние (подтверждено кодом, @2026-07-15)

| Факт | Где |
|------|-----|
| `EnsembleAnalysisRef` принимается только обобщённым входом `DetectionAnalysisRef` (санкц. union basn) | `packages/core/src/contracts/device-board/socket-type.ts:137-158` |
| `make-report-from-analysis` вход `analysis` прибит к `FftTrendAnalysisRef` (редактор) | `packages/device-board/src/graph/make-report-from-analysis-node.ts:40` |
| `make-combined-report` вход `analysis-1/2` = `DetectionAnalysisRef` (принимает оба вида) | `packages/device-board/src/graph/make-combined-report-node.ts:47-55` |
| Исполнитель `make-report-from-analysis` жёстко проверяет `analysisRef.kind === 'FftTrendAnalysisRef'` | `packages/device-board/src/runtime/block-executor.ts:506,521` |
| combined-исполнитель уже резолвит ensemble-детекцию из `ensembleStore` | `packages/device-board/src/runtime/block-executor.ts:1064-1066` |
| bridge `makeReportFromAnalysis` завязан только на `this.fftTrendAnalyses`; ensemble-анализы в bridge НЕ хранятся (живут в рантайм-`ensembleStore`) | `apps/client/src/modules/device-board/scenarioMicJournalBridge.ts:1309-1336, 261` |

**Вывод из состояния:** «самый дешёвый фикс» консилиума на деле **кросс-пакетный**
— `make-report-from-analysis` глубоко trend-связан в исполнителе И в bridge, тогда
как combined уже умеет оба вида. Значит A требует ensemble-пути в рантайме, а не
только правки сокета. Это не отменяет выбор A (новый узел дороже: +вид палитры +
консилиум-гейт + миграция сериализованных графов), но задаёт форму реализации.

## Решение

### Р1 — Расширить редакторский контракт узла (не новый узел)
Вход `analysis` узла `make-report-from-analysis`: `FftTrendAnalysisRef` →
**`DetectionAnalysisRef`** (обобщённый union). Имя «MakeReportFromAnalysis» уже
родовое («analysis», не «trend») — переименование НЕ нужно, критерий наглядности
(Rodchenko) выполняется. Обратная совместимость: union шире прежнего, сохранённые
графы с `FftTrendAnalysisRef` на входе остаются валидны. **Границы:** тип
`DetectionAnalysisRef` уже существует (санкц. union basn) — новый core-контракт НЕ
вводится, консилиум-гейт не нужен.

### Р2 — Рантайм: аддитивный ensemble-путь, trend-путь НЕ трогаем
Исполнитель `make-report-from-analysis`:
- `FftTrendAnalysisRef` → **существующий путь без изменений**
  (`host.makeReportFromAnalysis(reporterRef, analysisRef)`) — нулевой риск регресса
  спектрального отчёта и его схемы `trends-fft/v0.1`.
- `EnsembleAnalysisRef` → резолв детекции из `ensembleStore` (как combined) →
  **новый host-хук** `makeReportFromEnsembleAnalysis(reporterRef, {handle, detection})`
  → честный отчёт одиночного нейро-детектора (схема `neuro-detection/v1`, summary
  БЕЗ слова «combined»).

**Границы:** схема существующего trends-отчёта НЕ меняется; два хука на один узел —
осознанный размен ради нулевого риска (унификация в один хук — out of scope,
future cleanup). `make-combined-report` и combined-UC не трогаем.

### Р3 — Перевести нейро-FREE-граф на честный отчёт
`usercase-free-neuro-detection`: `make-combined-report` → `make-report-from-analysis`
(вход = ensemble-анализ). Узел на холсте больше не «combined»; граф проще (нет
analysis-2, track не нужен для одиночного отчёта — по факту графа).

## Definition of Done (реализация)
- [ ] Пин `analysis` = `DetectionAnalysisRef`; `isValidSocketConnection` пропускает ensemble на этот вход (уже, через union).
- [ ] Исполнитель: ensemble-ветвь строит отчёт; trend-ветвь бит-в-бит прежняя.
- [ ] host-стуб + client-bridge: `makeReportFromEnsembleAnalysis` даёт честный одиночный отчёт (без «combined»).
- [ ] Нейро-FREE-граф использует `make-report-from-analysis`; тест: узел `make-combined-report` в графе отсутствует, отчёт не «combined».
- [ ] scoped CI `@membrana/device-board` + `apps/client` зелёные; границы пакетов целы.

## Out of scope
- Новый узел `make-detection-report` (вариант B) — отвергнут.
- Унификация trend/ensemble в один host-хук — future cleanup.
- PC-2 (периодический гейт без рекордера) — отдельная задача спринта, вес консилиума.
- Узлы коллекции — эпик `batch-collection-run-contour` #494.

## Ссылки
- Консилиум: `docs/seanses/palette-nodes-free-clarity-2026-07-15.md`
- Спринт: `docs/prompts/PALETTE_CLARITY_NODES_PROMPT.md` (#493), коворк #487 RETROSPECTIVE
