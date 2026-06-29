<!-- Сгенерировано: 2026-06-24T15:09:03.345Z (yarn code-review; pr, pr-171) -->

Tier: T1

[Teamlead]: PR size OK (~100 lines). Гранины пакетов соблюдены; `@membrana/core` и `@membrana/device-board` синхронизированы. CONCEPT §15.7 обновлён. Вердикт: **LGTM** после зелёного `yarn turbo run lint typecheck test --filter=@membrana/core --filter=@membrana/device-board`. Утро: smoke GetRecorder/GetSpectralAnalyser в sidebar Pure checkbox и exec-pin stripping при toggle.

[Структурщик]: Слабая связанность соблюдена. Ref-provider критерий чёткий: `get-journal`, `get-reporter`, `get-recorder`, `get-spectral-analyser` — only singleton/session lookup, no per-tick host I/O. Contracts в `scenario-node-pure.ts` правильно переведены из `PURE_LOCKED_IMPURE` в `PURE_ELIGIBLE`. Тесты расширены корректно (pure-node-graph.test.ts +test для get-recorder). ✅

[Математик]: —

[Музыкант]: —

[Верстальщик]: UI-хинты в board-right-sidebar.tsx добавлены для `get-recorder` и `get-spectral-analyser` — краткие, соответствуют DESIGN.md. Sidebar checkbox логика работает (toggling pure → syncPureNodePins strips/restores exec pins). ✅

Итоговый артефакт: PR #171 готов к merge в main.

Definition of Done: 
- `yarn turbo run lint typecheck test --filter=@membrana/core --filter=@membrana/device-board` → green
- Manual: GetRecorder/GetSpectralAnalyser на canvas → Pure checkbox видим → toggle strips exec pins
- Manual: reload сценария → orphan exec edges удалены (`ApplyPureGraphHygiene`)
- CONCEPT §15.7 обновлён (ref-provider критерий)

Риски: —

Вердикт: **LGTM**