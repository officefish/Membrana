<!-- Сгенерировано: 2026-07-29T16:06:15.413Z (yarn code-review; staged, llm-xai) -->

Tier: T1

[Teamlead]: Tier T1. PR size: OK (~108 lines, 4 files). Diff — точечная доводка `finalizeReviewManifest`: запись `completion.acceptanceGate` и опциональный hard-gate через `checkAcceptance`; default `acceptanceMode = 'soft'` — безопасная миграция, не ломает существующий close-path. Схема fail-closed (`additionalProperties: false`, required `mode/verdict/reason`), тесты покрывают pass / soft-missing / hard-missing / hard-stale. К C8/C9 замечаний нет. Вердикт: **LGTM** после зелёного `yarn node --test scripts/task-closure-review.test.mjs scripts/task-closure-review-schema.test.mjs` (или эквивалент в turbo/scripts). К магистрали дня (`procedures-core-fields` / #1220) diff не относится — отдельный hygiene/closure-контур; не смешивать в один PR с ядром процедур без явной пометки.

[Структурщик]: Границы соблюдены: схема → lib → тесты рядом; новый импорт `checkAcceptance` из `./trace-acceptance.mjs` — слабая связанность, без протекания UI/React. `acceptanceGate` в `completion` опционален в schema (required по-прежнему только `mode`+`evidence`) — обратно совместимо с уже записанными артефактами. Поведение fail-closed на `verdict === 'hard'` в finalize — правильно; soft не блокирует state-переход. C7: четыре новых кейса достаточны для контракта soft/hard. Циклов пакетов нет (scripts-only).

[Математик]: —
[Музыкант]: —
[Верстальщик]: —

Итоговый артефакт: `docs/discussions/uncommitted-code-review.md` (staged: task-closure acceptanceGate)

Definition of Done:
- `yarn node --test scripts/task-closure-review.test.mjs scripts/task-closure-review-schema.test.mjs`
- при наличии общего скрипта схем — прогон schema-test suite, что уже трогает `task-closure-review.schema.json`

Риски:
- **P2**: в diff не видно контракта `checkAcceptance` (ожидаемые `verdict`/`reason` только через тесты) — при смене формулировок reason в `trace-acceptance.mjs` hard-тесты на `/поле приёмки отсутствует/` и `/подтверждение ложно/` хрупки; opportunity — стабильные code/enum причины, не только free-text.
- **P2**: `expectedHeadRev: manifest.currentCommitSha` — убедиться (вне diff), что после LGTM `currentCommitSha` всегда тот же, что `actualCommitSha` на finalize; иначе soft-pass может маскировать рассинхрон head (тесты сейчас держат SHA_A согласованным).

Вердикт: **LGTM**