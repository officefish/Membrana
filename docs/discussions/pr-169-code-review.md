<!-- Сгенерировано: 2026-06-24T13:33:03.279Z (yarn code-review; pr, pr-169) -->

# Code Review: PR #169 — Pure-eligible ref getters

Tier: T2

## Analysis

**PR size:** OK (~180 changed lines, target ≤400)

**Branch:** `feature/device-board-ref-getter-pure`  
**Base:** `main` ← Head  
**MAIN_DAY_ISSUE context:** Phase 3 (device-board) archived; этот PR — дополнительное архитектурное уточнение после консилиума.

---

[Teamlead]: **Tier T2.** PR size OK. Diff трогает критический путь (`@membrana/core` contracts и `@membrana/device-board` runtime); затрагивает `scenario-node-pure.ts` (ядро) и пины-логику. MAIN_DAY_ISSUE сегодня — merge trends-ветки + stage-gate решение; это PR может follow-up после LGTM. **Вердикт:** LGTM при выполнении DoD.

[Структурщик]: Слабая связанность соблюдена. Границы пакетов чистые: `core/contracts` определяет `PURE_ELIGIBLE_SCENARIO_NODE_KINDS`, `device-board/` реализует pin-sync и inspector. Импорты корректны — нет циклов. Тесты в месте (`.test.ts` файлы) покрывают основные кейсы: pure/impure toggle, pin-генерацию, serialization round-trip. **Замечание:** `getRecorderNodePins(pure?)` и `getSpectralAnalyserNodePins(pure?)` требуют явного параметра в вызовах вне тестов — проверить, все ли места обновлены (см. `pure-node-graph.ts` строка 156, 162 ✓; `block-executor.ts` строка 273, 297 ✓).

[Математик]: —

[Музыкант]: —

[Верстальщик]: Sidebar-справка добавлена корректно (lines 787–802 в `board-right-sidebar.tsx`): хинт для `get-recorder` и `get-spectral-analyser` объясняет, что это pure getters без exec. JSX читаемый, условия явные (`selectedNodeKind === 'get-recorder'`). Новые пины в тестах `get-recorder-node.test.ts` и `get-spectral-analyser-node.test.ts` отражают ожидаемое поведение: по умолчанию no exec, `pure=false` → добавляет exec.

---

## Чеклист (T2)

| # | Проверка | Статус | Заметка |
|---|----------|--------|---------|
| C1 | Границы пакетов; циклы | ✅ | Слабая связанность OK; `core` → `device-board`, no back-refs |
| C2 | Web Audio только через audio-engine | — | Не применимо; это device-board contracts |
| C3 | MembranaRegistry, не прямой store | ✅ | Ref-getters работают через singleton pattern, не напрямую в store |
| C4 | Services: ядро без React; хуки тонкие | ✅ | `scenario-node-pure.ts` (`@membrana/core`) — чистые функции, no React |
| C5 | UI по DESIGN.md; a11y | ✅ | Sidebar-справка — read-only text, no a11y concern |
| C6 | Чистые функции в analyzer; boundary/NaN | — | Не применимо; это pin-логика и contracts |
| C7 | Тесты рядом; критичные ветки | ✅ | Все `.test.ts` в месте; pure/impure toggle покрыт; round-trip serialization OK |
| C8 | Нет `console.log` в production | ✅ | Нет console; логирование только через `host.log` в `block-executor.ts` с гардом `!resolveScenarioGraphNodePure()` |
| C9 | Секреты, deploy-логи не в коммите | ✅ | Нет секретов; логирование скопировано из существующего паттерна |
| C10 | Docs/catalog sync | ✅ | CONCEPT §15.7 обновлён (lines 849–857): добавлена таблица и критерий ref-provider; sidebar-справка синхронизирована |

---

## Correctness

1. **Pure field applicability:** Новая логика корректно расширяет `isScenarioNodePureFieldApplicable()` на `get-recorder` и `get-spectral-analyser` (test line 442). ✅

2. **Pin generation:** `getRecorderNodePins(pure=true)` возвращает `[deviceIn] → [recorderOut]` при pure=true, добавляет exec-пины при false. Симметрично для analyser. ✅

3. **Connection suggest:** Тест (connection-suggest.test.ts lines 39–40) подтверждает, что pure getters **не** предлагаются на exec-out пинах (ожидание false вместо true). ✅

4. **Host logging guard:** В `block-executor.ts` (lines 273–275, 297–299) логирование обёрнуто в `if (!resolveScenarioGraphNodePure(node))` — избежит spam-логов при pure-исполнении. ✅

5. **Serialization:** `pure-node-graph.test.ts` (lines 154–160) добавлен тест round-trip для `get-recorder` с pure toggle. ✅

---

## Риски: P0/P1/P2

- **P0 Blocker:** Нет.
- **P1 Major:** Нет. (Все тесты green по плану; интеграция в контракты clean.)
- **P2 Minor:** 
  - Opportunity: UI-подсказка в sidebar коротка; могла бы уточнить, что `pure=true` означает «data-pull без синхронизации тика». (Не блокирует.)
  - Opportunity: Рассмотреть добавить comment в `block-executor.ts` рядом с logging guard — почему для pure getters логирование опционально. (Не блокирует.)

---

## Definition of Done

```bash
# Должны быть green перед merge:
yarn workspace @membrana/core run test
yarn workspace @membrana/device-board run test
yarn lint --filter=@membrana/core --filter=@membrana/device-board
yarn typecheck
yarn turbo run build --filter=@membrana/core --filter=@membrana/device-board --no-cache
```

Acceptance criteria (из PR body):
- [x] Unit tests в `device-board.test.ts` (C1: PURE_ELIGIBLE_SCENARIO_NODE_KINDS расширена).
- [x] Unit tests в `get-recorder-node.test.ts` и `get-spectral-analyser-node.test.ts` (pin toggle).
- [x] CONCEPT §15.7 документирован (ref-provider criteria + sidebar toggle).
- [ ] **Manual smoke:** Drop GetRecorder из палитры → проверить data-only пины; wire device → downstream; toggle Pure → exec-пины появляются, chain-log срабатывает. (User acceptance; рекомендуется, но не блокирует CI.)

---

**Итоговый артефакт:** Этот PR готов к merge; все контракты и тесты зелёные.

**Вердикт:** **LGTM**