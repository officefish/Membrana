# Промпт: meeting:audit check4 — own En ≠ sibling

> Размер: **S** · `id` = `meeting-audit-check4-own-room` · [#721](https://github.com/officefish/Membrana/issues/721).

## Контекст

`own = extractAgendaIds(protocol)` не ловит En в DoD без `**En` → ложная колонизация.
Канон: siblings = topic IDs минус ID комнаты (topic-файл / room key в имени протокола).

## Промпт целиком

В `scripts/lib/meeting-audit.mjs`: `meetingRoomKey`, `ownAgendaIdsForProtocol`; check4 на них.
Регрессия: DoD «для E1» → PASS; чужой H1 → FAIL. Smoke: `yarn meeting:audit --id linear-egress-gear-wiring`.

### Definition of Done

- [x] own из topic комнаты, не из тела
- [x] тест #721 + smoke linear-egress = 0 нарушений
