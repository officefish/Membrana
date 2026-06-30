# CLOSURE: sprint-process-guard

| Поле | Значение |
|------|----------|
| **Sprint** | `sprint-process-guard` |
| **Issue** | [#210](https://github.com/officefish/Membrana/issues/210) |
| **Opened** | 2026-06-30 |
| **Closed** | 2026-06-30 |
| **Verdict** | **shipped** |
| **PR** | [#212](https://github.com/officefish/Membrana/pull/212) |
| **Commit** | `fa64111` |

---

## DoD

- [x] CLAUDE.md: pre-sprint gate (5 пунктов, триггерные фразы)
- [x] CLAUDE.md: PowerShell 5.1 таблица
- [x] CLAUDE.md: semantic clarification rule
- [x] task-lifecycle SKILL.md: ⛔ STOP-барьер в Start
- [x] CLOSURE.md

---

## Delivered

| Файл | Изменение |
|------|-----------|
| `.claude/CLAUDE.md` | ⛔ Pre-sprint gate, PowerShell reminder, semantic rule |
| `.cursor/skills/membrana-task-lifecycle/SKILL.md` | ⛔ СТОП-блок в Start; 7 шагов вместо 4 |

---

## Ключевые решения

1. **Gate в CLAUDE.md, а не только в SKILL.md** — CLAUDE.md читается при каждом старте сессии; SKILL.md загружается только при явном вызове скилла. Gate в обоих местах создаёт двойную защиту.
2. **Триггерные фразы перечислены явно** — «начинаем», «да», «поехали» — потому что именно эти односложные ответы провоцировали прыжок в код.
3. **Таблица PowerShell** — сравнение «нужно / запрещено» быстрее читается в момент написания команды, чем текстовый абзац.
