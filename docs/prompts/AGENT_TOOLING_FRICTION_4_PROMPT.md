# Промпт: agent-tooling-friction-4

| Поле | Значение |
|------|----------|
| **ID** | `agent-tooling-friction-4` |
| **Размер** | M (зонтик) · фазы S×4 |
| **Lead (ревьюер / LGTM)** | vesnin |
| **Исполнитель** | агент (Cursor) · registry `leadPersona` на фазах = ozhegov |
| **Linear** | project `agent-tooling-friction-4` · связка assignee=Sergey · delegate=Cursor |
| **Источник** | tooling-needs ретро 22.07 (сессия procedure-frames F2–F5) |

## Цель

Снять четыре evidence-фрикции агентского ship/rebase на Windows без архитектурных развилок.

## Фазы

| ID | Issue | DoD |
|----|------:|-----|
| `atf4-pr-ship-conflicting` | GH | `pr:ship --merge-only` при `mergeable=CONFLICTING` / `DIRTY` — STOP до merge; печать команды rebase; тест |
| `atf4-active-also-open` | GH | Норма в `DAY_SPRINT_REGULATION` (+ короткий helper или комментарий-канон): не затирать Focus; править только «Also open» |
| `atf4-pr-body-file` | GH | `pr:ship` создаёт PR через tempfile + `--body-file` (не `--body`); путь длинный (не 8.3); тест/дока в скилле ship |
| `atf4-git-editor-rebase` | GH | Обёртка или хелпер: `GIT_EDITOR=true` / `:` для `rebase --continue` на Windows; норма в AGENTS грабли |

## Out of scope

- CI-зуб анти-дубль GROUP_* (deferred dynin из procedure-frames)
- Новые Linear Issue при free-limit (reuse / project-контейнер)

## Acceptance criteria

- [ ] Четыре фазы в main одним или несколькими PR; `Closes #N` на каждой
- [ ] Тесты `pr-ship` покрывают CONFLICTING STOP и body-file
- [ ] Грабля в AGENTS.md (TF-7) про CONFLICTING / body-file / EDITOR
- [ ] Linear project контейнер + связка исполнитель/ревьюер на дочерних
- [ ] Archive фаз + эпика после LGTM vesnin
