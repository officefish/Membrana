# CLOSURE: atlas-report-plane — плоскость отчётов в атласе

| Поле | Значение |
|------|----------|
| **Sprint** | `atlas-report-plane-2026-07-24` |
| **Epic** | `atlas-report-plane` · [#1097](https://github.com/officefish/Membrana/issues/1097) |
| **Status** | **closed** (продукт в PR; merge — по CI) |
| **Closed** | 2026-07-24 |
| **PR** | [#1107](https://github.com/officefish/Membrana/pull/1107) · `bc5169da` |
| **Ратификация** | владелец «ратифицирую» 2026-07-24 |

## Delivered

1. **Канон (W1):** `docs/audit` = report-plane; `docs/tasks` = domain; `docs/audit/tasks` = отчёты про задачи (derivative). GROUP + README audit/tasks + tooling-atlas.
2. **Engine (W2):** `discoverContainers` → `home` / `role` / `plane`; ATLAS/Mintlify ссылки по `home`; секции report · domain · meta; `--decompose --by plane`; 14 тестов.
3. **Surface (W3):** `--render` / `--check` OK; провода AGENTS + skills; llm-calls в report×4.

## Инварианты R1–R7

| ID | Статус |
|----|--------|
| R1 истина заданий в `docs/tasks` | ✅ |
| R2 ссылки ATLAS по `home` | ✅ |
| R3 role + plane в индексе | ✅ |
| R4 derivative / mirrorsFrom audit/tasks | ✅ (манифест не ломали) |
| R5 scripts/ вне атласа | ✅ |
| R6 Also open, Focus tasks-workshop цел | ✅ |
| R7 без rename домов | ✅ |

## Phases

| Phase | Issue | Archive |
|-------|------:|---------|
| W0 | #1098 | archived |
| W1 | #1099 | archived · Closes в PR |
| W2 | #1100 | archived · Closes в PR |
| W3 | #1101 | archived · Closes в PR |
| W4 | #1102 | этот CLOSURE |

## Out of scope (осталось вне v1)

- Мастерская `scripts/` в атласе
- Пересмотр V2 tasks-workshop
