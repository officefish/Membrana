# Промпт: K0 — эпик-промпт, границы, DoD

> **M** · `kam-k0-brief` · [#815](https://github.com/officefish/Membrana/issues/815) · lead **vesnin** · parent `kits-angelina-morning`

## Контекст

Старт эпика kits поверх контейнера `scripts/`. Семя #761; контракт манифеста уже
у pl-r3 / sbc-s3. K0 не пишет код кита — только рамку.

## Промпт целиком

Закрепить границы эпика в [`KITS_ANGELINA_MORNING_PROMPT.md`](./KITS_ANGELINA_MORNING_PROMPT.md)
и OPEN [`docs/day-sprint/kits-angelina-morning-2026-07-21/OPEN.md`](../day-sprint/kits-angelina-morning-2026-07-21/OPEN.md):

1. Дом кода = `scripts/`; дом китов = `kits/` (K1+); **не** `docs/audit/git/` / `docs/audit/scripts/`.
2. Соседство: sbc-s3 (#795), pl-r3 (#808), #761, morning-report (#788) — кто что не делает.
3. DoD эпика и таблица фаз K0–K5 с leadPersona.
4. Режимы latest/pinned названы; запрет второго schema-острова.

## DoD

- [x] Эпик-промпт полон (секция «Границы»).
- [x] OPEN спринта + `DAY_SPRINT_ACTIVE`.
- [x] LGTM vesnin (owner ok 2026-07-21).

## Out of scope

Код кита / `kits/` дерево / аудит SHA (K1–K3).
