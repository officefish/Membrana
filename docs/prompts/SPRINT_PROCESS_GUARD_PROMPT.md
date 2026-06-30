# SPRINT-PROCESS-GUARD: Процессная защита от пропуска регламента спринта

**Issue:** [#210](https://github.com/officefish/Membrana/issues/210)  
**Sprint:** sprint-process-guard  
**Дата:** 2026-06-30  

## Проблема

Claude Code нарушает регламент дважды в fv1-s1: уходит в Write/Edit без OPEN.md, task-lifecycle и командного обсуждения. Дополнительно: использует bash-синтаксис (`cat <<'EOF'`, `&&`) в PowerShell-среде. Делает assumption вместо вопроса при неоднозначных терминах.

## Scope

### PG1 — Pre-sprint gate в CLAUDE.md
Явный STOP-блок: 5 пунктов, которые Claude обязан выполнить до первого Write/Edit в новом спринте.

### PG2 — PowerShell reminder в CLAUDE.md
Секция о синтаксисе: heredoc `@'...'@`, нет `&&`, `$env:VAR`.

### PG3 — Semantic clarification rule в CLAUDE.md
Правило: при ≥2 интерпретациях термина — спросить до реализации.

### PG4 — STOP-барьер в task-lifecycle SKILL.md
Усилить секцию Start: явный ⛔ перед шагами, порядок: registry → issue → OPEN.md → ACTIVE → только потом промпт и код.

## Definition of Done

- [ ] CLAUDE.md: pre-sprint gate (5 чекбоксов)
- [ ] CLAUDE.md: PowerShell секция
- [ ] CLAUDE.md: semantic clarification rule
- [ ] task-lifecycle SKILL.md: ⛔ STOP-сигнал в Start
- [ ] CLOSURE.md
