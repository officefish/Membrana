# Промпт: B2 — specimens + audit + тесты

> **M** · `bc-b2-specimens` · [#881](https://github.com/officefish/Membrana/issues/881) · lead **dynin** · parent `bestiary-container`

## Промпт целиком

1. Specimens для silent / unwired / ornament / jargon-out (помечены specimen).
2. `yarn bestiary:audit` → производный `registry/BESTIARY_LIST.md`.
3. Тест: каждый class ≥1 hit на specimens/; провод в test:scripts.
4. Самопроверка: aim на specimens/ — не silent-green.

## Acceptance criteria

- [x] 4 specimen-класса ловятся (`bestiary:audit` 4/4; tests 5/5)
- [x] LGTM dynin (owner ok 2026-07-22)

## Out of scope

Эхо / смещение цели (B3); weekly cron (B4).
