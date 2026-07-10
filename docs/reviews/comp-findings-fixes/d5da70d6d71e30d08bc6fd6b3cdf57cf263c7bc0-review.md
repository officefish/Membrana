Tier: T2
Task: comp-findings-fixes
Commit: d5da70d6d71e30d08bc6fd6b3cdf57cf263c7bc0

[Teamlead]: PR средний (~10 файлов: 3 runtime src/test, 3 docs, registry). DoD консилиума #340 реализован по трём точкам: (1) kind в invalid-ref, (2) fusion→lastDetection, (3) молчащий пустой batch. Diff чистый — нет secrets/.env/log artifacts, unrelated файлов нет (registry+README закономерны). Однако при анализе correctness обнаружено расхождение реализации с явным решением консилиума по точке (2), что тянет на P1 (архитектурный gate, который сам консилиум объявил обязательным перед merge). BLOCK.

[Структурщик]: C1/C3 — инвариант «invalid-ref всегда несёт целевой kind» реализован ортогонально (valid отдельно от kind) в resolve-input.ts, коэрсия только при `!valid` — соответствует решению (1). Границы пакетов не нарушены (только device-board). НО: инвариант «единственный писатель lastDetection = fusion; при отсутствии fusion-узла legacy fallback» в коде не выражен — fusion всегда перезаписывает lastDetection на основании порядка exec, без явной проверки/теста fallback-пути. Это C7 (упущенный обязательный инвариант из DoD).

[Математик]: correctness — критично. Консилиум (2) вариант (б): «front-механика без изменений, питается fusion; combinedScore с agreement». Но реализация вводит **новый порог** `combinedScore >= DEFAULT_DETECTION_THRESHOLD` (0.5) внутри fusion-узла. Это ровно та «скрытая связь / жёсткий порог», которую консилиум отклонял в варианте (а). Решение (б) предполагало передавать combined-результат в front, а решение о detected принимает существующий front (гистерезис/EMA по lastDetection). Здесь же detected вычисляется хардкодом порога в fusion, что: (a) дублирует семантику branch-on-detection (там свой threshold, часто 0.55 у alpha), (b) расходится с DoD «alarm-front стартует по combinedScore» без второго независимого порога. Тесты fusion→lastDetection используют дефолт 0.5 и подтверждают именно хардкод, а не «front питается fusion». Порог 0.5 при combined 0.45/0.8 — но branch у alpha 0.55 → рассинхрон между входом в alarm и branch-решением. P1.

[Музыкант]: audio C2 — throw→молчащий skip на пустом окне реализован для обоих анализаторов (fft-trends, ensemble), ref остаётся invalid с целевым kind, exec продолжается, host.log с skipReason. Соответствует решению (3) и духу «n=0 ≠ поломка». Возражений по audio-runtime нет.

[Верстальщик]: UI/a11y C5 — в diff нет client-изменений (skeleton/aria-busy для «окно набирается» из DoD не входит в этот PR). Task scope — только платформа device-board, UI-часть DoD, видимо, вне этого коммита. Для данного SHA — не применимо, но отмечаю как незакрытый пункт DoD (P2, не блокер данного diff).

P0/P1:
1. P1 — `packages/device-board/src/runtime/block-executor.ts` (fusion→lastDetection): реализация вводит хардкод-порог `combinedScore >= DEFAULT_DETECTION_THRESHOLD` (0.5) для вычисления detected внутри fusion-узла. Консилиум (2) принял вариант (б) «front-механика без изменений, питается fusion», а не «fusion сам решает detected по фикс-порогу». Это восстанавливает отклонённую логику скрытого порога и расходится с branch-порогом сценариев (alpha=0.55) → рассинхрон входа в alarm и branch-решения.
2. P1 — `block-executor.ts`: инвариант «legacy fallback при отсутствии fusion-узла» не реализован явно и не покрыт тестом (DoD требует «тест на оба пути»). Fusion безусловно перезаписывает lastDetection; поведение графов без fusion-узла держится лишь на неявном «fusion не исполняется», но обязательный DoD-тест fallback отсутствует.

P2:
1. `docs/...` — UI-часть DoD (skeleton/aria-busy, сглаживание 400–500 ms) не в этом PR; отследить, что она покрыта отдельной задачей до передачи владельцу.
2. `fusion-node-executor.test.ts` — мёртвая переменная `producer` (`void producer;`) в тесте; убрать для читаемости.
3. DoD-строка «703 базовых теста» vs CONCEPT-артефакты (650/664/666) — расхождение baseline-цифр в docs; сверить фактический baseline.

Checks:
- `git diff --check` — pass (exit 0, SHA d5da70d, 2026-07-10T11:25:23Z)
- `yarn turbo run lint typecheck test --filter=@membrana/device-board --filter=@membrana/client && yarn check:boundaries && yarn verify:wire-sync` — pass (exit 0, SHA d5da70d, 2026-07-10T11:25:29Z)
- `github-check:optional-review` — skipped (SHA d5da70d)
- `github-check:Lint, typecheck, test, build` — skipped (SHA d5da70d)
- `github-check:Turbo unit tests` — skipped (SHA d5da70d)

Closure readiness: needs_fix
Verdict: BLOCK

Примечание: local checks зелёные и не stale (тот же SHA), P0/P1 не про тесты, а про расхождение реализации точки (2) с явным решением консилиума и отсутствие обязательного DoD-инварианта fallback. Консилиум сам сделал «LGTM Teamlead после ревью границ» обязательным гейтом — при обнаруженном рассинхроне порогов и незакрытом fallback выдаю BLOCK. GitHub PR #341 open, merge не подтверждён — утверждать merged/closed нельзя.
