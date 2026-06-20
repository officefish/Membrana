# Product requirements: Device Board MVP Documentation

> **ChatPRD sync target.** Импортируйте или скопируйте в ChatPRD как документ «Device Board MVP Docs».
> Локальная копия в репо: `prd/device-board-mvp-docs.md` (commit для команды).
> Эпик: `db-doc-v04-mvp` · prompt: `docs/prompts/DEVICE_BOARD_DOC_V04_PROMPT.md`

---

## Problem

Device-board достиг MVP (PR #96–#123, 18–19 июня 2026): runtime, variables, palette, streaming E2E, editor UX. Документация разрознена (`DEVICE_BOARD_CONCEPT`, prompts, catalog) — операторы и агенты не имеют единого node reference и cookbooks.

## Goals

1. Опубликовать **Mintlify** site в `apps/docs` с MVP scope.
2. Описать **каждый palette/system node** + 3 concept pages + 2 cookbooks.
3. Подключить **MCP tier4** (Mintlify, ChatPRD, Atlan) для агентного workflow.
4. Синхронизировать **catalog** `device-board.md` → `stable`.

## Non-goals

- Membrana Device desktop app docs
- Полная документация legacy D0 blocks (record-chunk, trends-fft) — только mention
- Atlan как source of runtime semantics

## User stories

| As a… | I want… | So that… |
|-------|---------|----------|
| Operator | cookbook On start → main | собрать mic pipeline без чтения кода |
| Developer | node page с pins + preconditions | не повторять ошибку isValid(mic) vs stream |
| AI agent | stable catalog + Mintlify links | править device-board без регрессий |
| Teamlead | ChatPRD alignment | DoD эпика проверяемый |

## MVP documentation scope

### In scope

- Concepts: reference model, variable store, streaming lifecycle
- Nodes: all `V04_PALETTE_NODE_KINDS` + event, variable-get/set, loop-repeat
- Cookbooks: on-start-to-main, operator Print/metadata
- Editor: save/draft, export branch, inspector (overview)
- Architecture: signal vs scenario, host bridge

### Out of scope

- Scheduled jobs
- Cloud WS persist only
- Pre-run static warnings (отдельный эпик)

## Acceptance criteria

- [ ] `apps/docs` поднимается `yarn docs:dev`
- [ ] ≥3 concept + ≥8 node pages + ≥2 cookbooks в Mintlify nav
- [ ] `docs/catalog/client/prompts/modules/device-board.md` status stable + links
- [ ] `docs/DOCUMENTATION_WORKFLOW.md` + tier4 MCP fragment
- [ ] `yarn mcp:phase-d` генерирует отчёт без ошибок
- [ ] Atlan glossary: ≥3 термина Membrana (MicrophoneRef, AudioStreamRef, ScenarioBranch) — если tenant доступен
- [ ] 3 Docs Canvas: architecture, streaming, branches (артефакты в PR или screenshots)

## Technical notes

- Package: `apps/docs` (`@membrana/docs`), не `apps/client`
- Source of truth для runtime: `packages/device-board/src/runtime/`
- Atlan MCP: corporate glossary only; behavior from code

## Milestones

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 0 | apps/docs skeleton, tier4 MCP, prompt, PRD | ✅ |
| 1 | Concepts + catalog stable | pending |
| 2 | All node pages + cookbooks | pending |
| 3 | Canvas + ChatPRD alignment | pending |

## References

- PRs #96–#123 device-board
- `docs/SCENARIO_RUNTIME.md`
- `packages/device-board/DEVICE_BOARD_CONCEPT.md`
