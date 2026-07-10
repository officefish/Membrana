```text
Tier: T2
Task: basn-1-ensemble-analysis
Commit: 510ebaa30bfc4efd9fef269f29f0d99c7b33d3e0

[Teamlead]: basn-1 добавляет узел make-ensemble-analysis (второй детектор через host-мост EnsembleProducer → EnsembleAnalysisRef), stateless-узел + per-node store + fusion-интеграция. PR средний (~16 файлов, 3 пакета, границы соблюдены). Корректность/архитектура в порядке, но два теста-файла содержат некорректно отформатированные fixture-строки в literal-массивах — при этом evidence заявляет lint/test pass. Это противоречие требует прояснения. BLOCK.
[Структурщик]: C1 kind-регистрация полная (core kind → pins/factory → executor → palette → board-ui section → store → resolve → runtime wiring), boundaries держатся (device-board импортирует только core; EnsembleProducer только в client-bridge). C3/C4: EnsembleAnalysisRuntimeStore зеркалит FftTrendAnalysisRuntimeStore, resetAll подключён в оба teardown-пути. C7: см. P1-2 — форматирование в двух palette-снапшот-тестах ломает читаемость и, судя по diff, порядок массива (make-ensemble-analysis вставлен ПЕРЕД make-detection-fusion в тестах, но в palette-node.ts/board-ui.ts тоже перед — согласовано, но отступы битые).
[Математик]: Fusion-интеграция: ensemble confidence подаётся сырым combinedScore в fuseDetectorConfidences (не бинарный вердикт) — соответствует консилиуму ND3. Тест (0.9+0.7)/2=0.8 корректен. Порог detected `combinedScore >= 0.5` захардкожен в bridge — см. P2, но не math-blocker.
[Музыкант]: Host-мост C2: makeEnsembleAnalysisFromSampleRefs корректно фильтрует по kind==='AudioSampleRef', concat payloads, EnsembleProducer с createCombinedStreamDetectors (как в mic-combined-detection), chain-log start/skip/done с elapsedMs. Async, рантайм не блокируется. Опциональный метод host + stub-реализация + executor guard на undefined — ок.
[Верстальщик]: — (UI/a11y не затронуты в basn-1; skeleton/aria-busy относятся к basn-5).

P0/P1:
1. (P1) Evidence-противоречие: `packages/device-board/src/graph/palette-node.test.ts` и `packages/device-board/src/types/board-ui.test.ts` содержат сломанные отступы в literal-массивах (`+            'make-ensemble-analysis',` с лишними пробелами и `+'make-detection-fusion',` без отступа). Manifest заявляет `yarn turbo run lint typecheck test ... pass` на этом же SHA. Либо lint/prettier не покрывает эти строки (тогда пробел в конфиге), либо evidence stale/неполный. Пути: `packages/device-board/src/graph/palette-node.test.ts`, `packages/device-board/src/types/board-ui.test.ts`. Требуется прогон lint --check / prettier --check с сохранённым exit code именно по этим файлам.

P2:
1. Порог `combinedScore >= 0.5` захардкожен в `scenarioMicJournalBridge.makeEnsembleAnalysisFromSampleRefs` — промпт basn-1 упоминает policy-опции на узле (детекторы, веса, smoothing). Порог/policy не проброшены; допустимо для M-инкремента, но стоит вынести в опции узла. Путь: `apps/client/src/modules/device-board/scenarioMicJournalBridge.ts`.
2. `smoothing: 1` зашит константой в EnsembleProducer — тот же policy-gap. Путь: тот же.
3. Комментарий-заглушка убран корректно, но `family: ref.kind === 'FftTrendAnalysisRef' ? 'dsp' : 'ensemble'` — else-ветка ловит любой не-FftTrend kind как ensemble; при появлении новых ref-kind в fusion это станет молчаливо неверным. Путь: `packages/device-board/src/runtime/block-executor.ts`.

Checks:
- git diff --check — pass (exit 0, 510ebaa, 2026-07-09T15:49:45Z)
- yarn turbo lint typecheck test (core+device-board) && check:boundaries && verify:wire-sync && typecheck client — заявлен pass (exit 0, 510ebaa, 2026-07-09T15:50:25Z), но противоречит форматированию тестов (P1-1) → требует перепроверки
- github-check:optional-review — skipped
- github-check:Decide if studio affected — skipped
- github-check:Lint, typecheck, test, build — skipped
- github-check:Turbo unit tests — skipped

Closure readiness: needs_fix
Verdict: BLOCK
```
