# Insight process — ACTIVE

| Поле | Значение |
|------|----------|
| **Sprint** | `insight-process-registration-2026-06-25` |
| **Status** | **closed** (2026-06-25) |
| **CLOSURE** | [`day-sprint/insight-process-registration-2026-06-25/CLOSURE.md`](./day-sprint/insight-process-registration-2026-06-25/CLOSURE.md) |

## Процесс живёт

Инсайты продолжают накапливаться в [`insights/registry.json`](./insights/registry.json).  
Команды: `yarn insight create | research | review | close`

## Adopted (plan:week)

### Epic candidate (LGTM 2026-06-25 → реализация 2026-06-26)

| ID | Weight | Название |
|----|--------|----------|
| **`insight-vesnin-adopted-epic-bridge`** | 7.0 | Мост adopted insight → week epic |

Остальные adopted — **watch** до следующего `plan:week`.

| ID | Weight |
|----|--------|
| `insight-operator-smoke-ci-gate` | 7.0 |
| `insight-async-v2-product-narrative` | 6.6 |
| `insight-competition-catalog-pipeline` | 6.6 |
| `insight-agent-scenario-builder` | 7.8 |
| `insight-slide-fullscreen-presentation` | 7.8 |
| `insight-server-forwarding` | 7.8 |
| `insight-sunrise-flash` | 6.6 |

## Deferred

| ID | Weight |
|----|--------|
| `insight-loop-engineering-competition-test` | 6.8 |

## Добавить инсайт

```bash
# Пользователь
yarn insight create <slug> --title "…" --source user

# Роль виртуальной команды (см. INSIGHT_REGULATION § Team insights)
yarn insight create <slug> --title "…" --source virtual-team-vesnin
```
