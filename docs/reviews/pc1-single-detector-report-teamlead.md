# Teamlead closure review — PC-1 (pc1-single-detector-report, #493, PR #498)

**Ревьюер:** Vesnin (Teamlead) · **Дата:** 2026-07-15 · **Канал:** offline (кредит пуст)
**Вердикт:** ✅ **LGTM**

## Что проверено (не рубрика, а реальные точки риска)

| # | Точка | Вывод |
|---|-------|-------|
| 1 | **Синтетический `trackId` нейро-отчёта** — сломает ли журнал? | ✅ НЕТ. trends-отчёт использует ровно тот же паттерн (`trendsFftSyntheticTrackId`, `makeTrendsFftScenarioReportPayload.ts:20`) — синтетический trackId санкционирован. По ходу ревью выведен из `reportId` (как trends), а не из handle — консистентность. |
| 2 | **Backward-compat расширения сокета** `FftTrendAnalysisRef`→`DetectionAnalysisRef` | ✅ union шире прежнего; `isValidSocketConnection('FftTrendAnalysisRef','DetectionAnalysisRef')`=true. Сохранённые графы валидны — вся device-board-сюита (793) зелёная, включая существующие граф-тесты. |
| 3 | **Trend-путь исполнителя не задет** (нулевой риск регресса спектра) | ✅ ветка `FftTrendAnalysisRef` бит-в-бит прежняя; ensemble — отдельный `else if`. |
| 4 | **Graceful при null-детекции / отсутствии хука** | ✅ `ensembleStore?... null` → reportId остаётся null, сценарий не рушится; `host.makeReportFromEnsembleAnalysis === undefined` → ветка пропускается. |
| 5 | **Дедуп отчёта** (combined кэширует по хэшу) | ⚠️→OK. Нейро-путь не кэширует — но и trends-путь `makeReportFromAnalysis` не кэширует; поведение консистентно, дубли гасит report-build job downstream. Не блокер (совпадает с существующим паттерном). |
| 6 | **Наглядность (условие Rodchenko)** | ✅ узел «MakeReportFromAnalysis» (не combined); summary «нейро 0.82» без «combined» — юнит-тест bridge. В графе нет узла `make-combined-report` — граф-тест. |
| 7 | **Границы: новый core-контракт?** | ✅ НЕТ. Тип `DetectionAnalysisRef` уже существует (санкц. union basn); схема `neuro-detection/v1` — аддитивна в non-exhaustive allowlist (как `combined-detection/v1`). Узел палитры НЕ вводится → консилиум-гейт не нужен, ADR корректен. |

## Замечание, устранённое в ревью
- `trackId` нейро-отчёта: было `neuro-detection:${handle}` → стало `neuro-detection:${reportId}` (паттерн trends, стабильность/консистентность). Юнит-тест bridge зелёный (13).

## CI
scoped: core 138 + device-board 793 + client 297 (typecheck + test + lint, 28 задач turbo) — зелёный.

## Вердикт
**LGTM.** Реализация аддитивна, backward-compatible, границы пакетов целы, наглядность
закрыта тестами. ADR-0006 → ACCEPTED (директива владельца «ревью+мёрж PC-1» = LGTM
решения по варианту A). Мёрж разрешён; далее closure на squash-SHA + архив карточки.
