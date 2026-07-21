# CLOSURE — branch-mintlify-engine

| Field | Value |
|-------|-------|
| Epic | `branch-mintlify-engine` · [#823](https://github.com/officefish/Membrana/issues/823) |
| Date | 2026-07-21 |
| Delivery PR | [#835](https://github.com/officefish/Membrana/pull/835) · `84ea5175` |
| Status | **CLOSED** |

## Server-first (зафиксировано)

| Слой | Путь |
|------|------|
| Контейнер | `docs/audit/git/` |
| Движок | Mintlify · `apps/docs/git/cookbooks/*` · группа `Git — branch cases` |
| Пин | `docs/audit/git/pins/branch-instructions.manifest.json` · `yarn audit:branch-instructions-pin` |

Пин = подграф **инструкций**, не hygiene-реестр и не `kits/` (#814).

## Сделано

| Фаза | Issue | Артефакт |
|------|------:|----------|
| F0 | #824 | SESSION_CONTEXT + engine в README |
| F1 | #825 | `analysis/branch-cases-catalog-2026-07-21.md` |
| F2 | #826 | 5 cookbooks MDX · `docs.json` · `yarn docs:lint` |
| F3 | #827 | провода README / AGENT_PROMPT → cookbooks |
| F4 | #828 | манифест path→SHA + аудит + тесты drift/missing |
| F5 | #829 | этот CLOSURE + archive |

## Handoff

- Дыры ассортимента (cowork / research / hackathon / `feature/*`) описаны в каталоге и cookbooks — live-примеров нет, грамматика всё равно канон.
- Обновление пина после правки cookbooks: `yarn audit:branch-instructions-pin --write` + отдельный коммит манифеста.
- Не колонизировать `kits-angelina-morning`; Р4-валидатор (#813) — соседний зуб, не дублировать.

## Archive

`yarn task:archive` для F0–F5 + эпика · notes: PR #835 merged.
