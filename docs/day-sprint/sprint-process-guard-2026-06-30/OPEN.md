# OPEN: sprint-process-guard — процессная защита

| Поле | Значение |
|------|----------|
| **Sprint** | `sprint-process-guard` |
| **Issue** | [#210](https://github.com/officefish/Membrana/issues/210) |
| **Ветка** | `process/sprint-process-guard` |
| **Opened** | 2026-06-30 |
| **Триггер** | Двойное нарушение регламента в fv1-s1 + рефлексия |

## Почему этот спринт

Claude нарушил регламент спринта дважды подряд в fv1-s1: пошёл в код без OPEN.md, task-lifecycle скилла и командного обсуждения. Проблема не в незнании — в отсутствии видимого STOP-барьера перед первым Write/Edit. Также: bash-синтаксис в PowerShell-среде, assumption вместо вопроса.

## Фазы

### ✅ PG0 — Регламент

- [x] Issue #210
- [x] Ветка `process/sprint-process-guard`
- [x] Промпт: `docs/prompts/SPRINT_PROCESS_GUARD_PROMPT.md`
- [x] registry.json: `sprint-process-guard` → active
- [x] OPEN.md

### ✅ PG1 — Pre-sprint gate в CLAUDE.md

- [x] ⛔ STOP-блок: 5 пунктов до первого Write/Edit
- [x] Триггерные фразы: «начинаем», «да», «поехали», «продолжаем спринт»

### ✅ PG2 — PowerShell reminder в CLAUDE.md

- [x] Таблица: `@'...'@` vs `cat <<'EOF'`, `;` vs `&&`, `$env:VAR`, `New-Item`

### ✅ PG3 — Semantic clarification rule в CLAUDE.md

- [x] Правило: при ≥2 интерпретациях → спросить до первой строки кода

### ✅ PG4 — STOP-барьер в task-lifecycle SKILL.md

- [x] `⛔ СТОП` перед шагами Start
- [x] Порядок: registry → issue → OPEN → ACTIVE → промпт → код
- [x] «Пропуск любого = нарушение регламента»

### ⬜ PG5 — PR + CLOSURE
