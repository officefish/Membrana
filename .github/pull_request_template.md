## Summary

<!-- 1–3 предложения: зачем PR -->

## Test plan

- [ ] `yarn turbo run lint typecheck test build --continue` (или указать scope)
- [ ] Ручная проверка (если UI / микрофон)

## Stage-gate / Single-Node Detection First

- [ ] PR **не** добавляет TDOA, localizer, tracker, transport или многоузловую синхронизацию до stage-gate 1→2
- [ ] Если затронуты детекторы — `yarn benchmark:detectors` на synthetic v0.1 (или обоснование, почему не запускали)

## Task / Issue

- Реестр: `docs/tasks/registry.json` id: <!-- task-id -->
- Closes #<!-- issue -->
