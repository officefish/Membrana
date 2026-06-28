# Day Sprint — Closure: docs/actions фаза A (device-board processes)

| Поле | Значение |
|------|----------|
| **sprintId** | `docs-actions-phase-a-2026-06-26` |
| **Issue** | [#182](https://github.com/officefish/Membrana/issues/182) |
| **closed** | 2026-06-26 |
| **outcome** | **Phase A complete** — 13 MD-процессов вынесены в `docs/actions/device-board/**`; JSON/fixtures не тронуты; CI green |

---

## Acceptance criteria (Issue #182)

| # | Критерий | Статус |
|---|----------|--------|
| 1 | `docs/actions/device-board/` содержит 13 MD-процессов по матрице | ✅ 13/13 |
| 2 | JSON/fixtures остаются в `docs/device-board-scripts/`; `verify-paths` green | ✅ `verify-paths OK (55 paths)` |
| 3 | Redirect-stubs на старых MD-путях (удаление не раньше 2026-07-26) | ✅ 13 stubs |
| 4 | Skills, `.cursorrules`, `AGENTS.md` указывают на новые пути | ✅ |
| 5 | RAG incremental index выполнен **или** defer documented | ✅ defer documented (A5) |

---

## Verification log (2026-06-26)

```text
node scripts/usercase.mjs verify-paths        → OK (55 paths)
node scripts/usercase.mjs verify-competition  → green
find docs/actions/device-board -name '*.md'   → 13
device-board-scripts/*.md stubs               → 13 (+ README fixtures hub)
rg 'device-board-scripts/[A-Z_].*\.md'        → README.md (hub, остаётся) + migrate-docs-actions-phase-a.mjs + frozen seance transcript
```

Все совпадения grep-аудита легитимны: `README.md` остаётся в `device-board-scripts/` как fixtures-hub, migration-script разрешён gate'ом, seance-транскрипт — исторический (ссылается на не-перенесённый файл). Стейл-ссылок на 13 перенесённых MD — **0**.

---

## Перенесённые процессы (матрица)

| Категория | Файлы |
|-----------|-------|
| root | `USERCASE_GENERATION_REGULATION.md`, `USERCASE_COMPETITION_LESSONS.md`, `STUDIO_HOST_LESSONS.md`, `CLIENT_LOGS_PARSING.md` |
| `smoke/` | `DEVICE_BOARD_SERVER_FIRST_SMOKE.md`, `DEVICE_BOARD_SERVER_FIRST_SMOKE_SANDBOX.md`, `DB_RECORDING_PARITY_SMOKE_MATRIX.md`, `DB_TRENDS_FFT_PARITY_SMOKE_MATRIX.md` |
| `cookbooks/` | `SCENARIO_CHAIN_LOG_COOKBOOK.md` |
| `sign-offs/` | `USERCASE_MVP_MICROPHONE_LGTM.md`, `PURE_GETTERS_LGTM.md`, `DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md` |
| `specs/` | `USERCASE_MVP_MICROPHONE.md` |

Team reviews → `docs/archive/device-board-reviews/` (`DB_REALTIME_OBSERVATION_TEAMLEAD_REVIEW.md`, `DB_TRACE_P0_P3_TEAMLEAD_REVIEW.md`).

---

## Phases archived

`da-a0` … `da-a6` + parent `docs-actions-phase-a-2026-06-26` — все `archived: 2026-06-26` в `docs/tasks/registry.json` (карточки в `docs/tasks/archive/`).

---

## Deferred (explicitly)

- **A5 — RAG incremental index.** Блокер снят: `OPENAI_API_KEY` теперь в `.env`. Запуск — **локально** на машине разработчика (эмбеддинги идут через `HTTPS_PROXY=http://127.0.0.x`, доступный только на localhost; прямой выход на `api.openai.com` из CI/sandbox закрыт). Команда:
  ```bash
  yarn rag:index:incremental          # = вечерний хук scripts/rag-evening-index.mjs
  yarn rag:query "USERCASE_GENERATION_REGULATION"   # smoke
  ```
  Требует `OPENAI_API_KEY` в окружении процесса (есть в `.env`; убедиться, что shell/лаунчер его подгружает).
- **Удаление redirect-stubs** — отдельная задача, не раньше **2026-07-26** (4 недели после merge).
- **Фаза B** — rename fixtures root `device-board-scripts` → `docs/device-board/fixtures/` (отдельный epic).

---

## LGTM

**Teamlead (Vesnin): LGTM.** Все 5 acceptance criteria выполнены, инварианты фазы A соблюдены (JSON-пути, `usercase-write-guard.mjs` allowlist, CI workflow paths, `manifest.json` golden — не тронуты). Закрытие принято; остаётся PR + пост-мердж RAG index.

---

*Sprint docs-actions-phase-a-2026-06-26 — closed 2026-06-26.*
