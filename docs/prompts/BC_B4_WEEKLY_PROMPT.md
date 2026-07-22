# Промпт: B4 — недельный прогон

> **M** · `bc-b4-weekly` · [#883](https://github.com/officefish/Membrana/issues/883) · lead **angelina** · parent `bestiary-container`

## Промпт целиком

Недельный report в `analysis/`, тренд vs прошлый снимок; аудитор не молчун
(видимый summary; not-run ≠ clean). Отдельный yarn (не ветка night-hunt).

## Реализация

| Что | Где |
|-----|-----|
| CLI | `yarn bestiary:weekly` → `scripts/bestiary-weekly.mjs` |
| Ядро | `scripts/lib/bestiary-weekly.mjs` (reuse `lens-bestiary` / `bestiary-audit`) |
| Артефакт | `docs/audit/bestiary/analysis/bestiary-run-YYYY-MM-DD.md` |
| Тесты | `scripts/bestiary-weekly.test.mjs` (Summary always; not-run ≠ clean) |
| Ветка | `feat/bc-b4-weekly` · holder angelina (карточка) |

Флаги: `--json` · `--no-write` · `--date YYYY-MM-DD` · `--extra <path>`.

## Acceptance criteria

- [x] Report + анти-молчун контракт (`## Summary` всегда; `not-run` ≠ `clean`)
- [x] LGTM angelina (owner ok 2026-07-22)

## Out of scope

Автофикс находок (#533); вшивание в night-hunt jobs.
