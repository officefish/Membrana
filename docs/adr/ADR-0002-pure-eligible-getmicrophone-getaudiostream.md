# ADR 0002 — pure-toggle для `get-microphone` / `get-audio-stream` (default IMPURE)

> **Статус:** ACCEPTED · 2026-07-12
> **Гейт:** light ADR/PR (предрешено `LOOP_SWITCH_CONTROL_ADR.md` §«Открытые задачи», строка pure-геттеры — «лёгкий ADR/PR, не полный консилиум»). Не новый node kind, не новый сокет — расширение существующей pure-eligibility классификации.

## Контекст

`get-microphone` / `get-audio-stream` лежали в `PURE_LOCKED_IMPURE_SCENARIO_NODE_KINDS`
(`packages/core/.../scenario-node-pure.ts`): поле `pure` всегда стрипалось, узел всегда
impure → обязателен exec-passthrough. Но семантически эти узлы — **ref-провайдеры потока**
(отдают ссылку на mic/stream-сессию), как `get-recorder`. Per-tick host-I/O делают уже
`get-sample` / `get-fft-frame` (они остаются locked-impure). «Семантическая дыра»: автор не
мог собрать one-shot-приобретение потока в `initial` и раздачу ref по data-edge.

## Решение

Ввести категорию **`PURE_ELIGIBLE_DEFAULT_IMPURE_SCENARIO_NODE_KINDS`** = `['get-microphone',
'get-audio-stream']`, вынести их из locked-impure. Эти узлы становятся **toggle-able**
(pure↔impure в инспекторе), но с **DEFAULT = impure**, в отличие от `get-recorder`
(default pure).

**Почему default IMPURE, а не pure (как `get-recorder`):**
- приобретение устройства = host side-effect (`getUserMedia`/permission-prompt) — по
  умолчанию остаётся на exec-цепочке (детерминизм порядка приобретения);
- обратная совместимость: все существующие графы (Alpha/Beta/Gamma, competition-шаблоны)
  держат эти узлы без поля `pure` → `resolve*Pure` = `false` = текущее поведение. Ни один
  персистентный граф не меняет топологию. Миграция не нужна;
- pure — осознанный opt-in автора («приобретаю ref один раз в initial, дальше data-edge»).

## Механика

- `resolveDefaultPureForEligibleKind(kind)` → `false` для default-impure списка, иначе
  `DEFAULT_PURE_ELIGIBLE` (`true`).
- `isPureEligibleScenarioNodeKind` покрывает оба списка → `pure`-поле применимо, инспектор
  показывает тумблер, badge `pure` появляется только при явном opt-in.
- `resolveScenarioGraphNodePure` / `normalizeScenarioGraphNodePure` берут per-kind default;
  `effective === default` → поле стрипается (чистый JSON).

## Последствия

- Инспектор device-board показывает pure-тумблер на get-microphone/get-audio-stream (был
  скрыт). Badge/сериализация появляются только при `pure: true`.
- `resolveScenarioGraphNodeSupportsAsync` для этих узлов при `pure:true` → async-capable
  (exec-transparent) — согласовано с pure-allowance §async.
- Тесты core, кодировавшие locked-impure для `get-audio-stream`, обновлены на eligible +
  default-impure.

## Ссылки

- `LOOP_SWITCH_CONTROL_ADR.md` (тема 4 — pure-геттеры), `DEVICE_BOARD_PURE_GETTERS_EPIC_PROMPT.md`.
