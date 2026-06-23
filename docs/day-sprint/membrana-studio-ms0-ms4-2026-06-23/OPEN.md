# Day sprint OPEN — membrana-studio-ms0-ms4-2026-06-23

| Поле | Значение |
|------|----------|
| **Sprint id** | `membrana-studio-ms0-ms4-day-sprint` |
| **Epic** | `membrana-studio-desktop` |
| **Issue** | [#93](https://github.com/officefish/Membrana/issues/93) |
| **Opened** | 2026-06-23 |
| **Scope** | MS0–MS4 (MS5 deferred) |
| **Constraint** | **No `apps/client` changes** |

## Prompt

[`MEMBRANA_STUDIO_MS0_MS4_DAY_SPRINT_PROMPT.md`](../../prompts/MEMBRANA_STUDIO_MS0_MS4_DAY_SPRINT_PROMPT.md)

## Phase queue

| # | id | Lead | First action |
|---|-----|------|--------------|
| 0 | `membrana-studio-ms0-canon` | Vesnin | Audit `MEMBRANE_PLATFORM` + README |
| 1 | `membrana-studio-ms1-shell` | Ozhegov | `yarn studio:dev` smoke |
| 2 | `membrana-studio-ms2-media-fs` | Ozhegov | FS + tests; Dynin quota review |
| 3 | `membrana-studio-ms3-journal-fs` | Ozhegov | Journal/trends FS verify |
| 4 | `membrana-studio-ms4-installer` | Rodchenko | `yarn studio:package` + CI |

## Intake (code already present)

- `apps/membrana-studio/` — shell, FS, electron-builder config
- `yarn studio:dev` / `studio:build` / `studio:package` in root `package.json`
- `.github/workflows/desktop-studio.yml`
- Unit tests: 7/7 green (`media-library`, `journal`, `trends`)

## Sprint DoD

Verify → gap-fix (studio only) → archive MS0–MS4 → CLOSURE.md → Issue report.
