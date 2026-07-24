# OPEN: atlas-report-plane — плоскость отчётов в атласе

| Поле | Значение |
|------|----------|
| **Sprint** | `atlas-report-plane-2026-07-24` |
| **Registry epic** | `atlas-report-plane` · [#1097](https://github.com/officefish/Membrana/issues/1097) |
| **Status** | **open** |
| **Kind** | day-sprint (эпик L + фазы M) |
| **Size** | L |
| **Lead epic** | vesnin |
| **Craft** | ozhegov (W1–W3) |
| **Started** | 2026-07-24 |
| **Ратификация** | владелец «ратифицирую» 2026-07-24 (чат; раскладка `hfnbabwbhe.`) |
| **Мета-дом** | [`docs/tooling-atlas/`](../../tooling-atlas/) |
| **Паттерны** | [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md) · [`HOME_WORKSHOP`](../../patterns/HOME_WORKSHOP.md) |
| **Стык** | [`tasks-workshop`](../../prompts/TASKS_WORKSHOP_SPRINT_PROMPT.md) V2 — не пересматривать |

**Промпт эпика:** [`ATLAS_REPORT_PLANE_PROMPT.md`](../../prompts/ATLAS_REPORT_PLANE_PROMPT.md)

---

## Цель

Чтобы атлас (контейнер контейнеров) **не сплющивал** предметный дом заданий и
слот отчётов по задачам: явно показать, что `docs/audit` — двумерная плоскость
отчётов, а `docs/audit/tasks` — отчёты **про** `docs/tasks`, не второй реестр.

## Модель (канон спринта)

```text
domain:     docs/tasks          ← задания (primary)
report:     docs/audit/*        ← плоскость отчётов
            ├─ git/             ← отчёты про ветки
            ├─ tasks/           ← отчёты про задачи (derivative → docs/tasks)
            ├─ bestiary/
            └─ llm-calls/
meta:       docs/tooling-atlas  ← индекс контейнеров
```

## Phases

| Phase | Registry id | Issue | Lead | Prompt | DoD | Status |
|-------|-------------|------:|------|--------|-----|--------|
| **W0** | `arp-w0-brief` | [#1098](https://github.com/officefish/Membrana/issues/1098) | vesnin | [`ARP_W0_BRIEF_PROMPT.md`](../../prompts/ARP_W0_BRIEF_PROMPT.md) | OPEN + Issues + ACTIVE Also open | **done** |
| **W1** | `arp-w1-canon` | [#1099](https://github.com/officefish/Membrana/issues/1099) | ozhegov | [`ARP_W1_CANON_PROMPT.md`](../../prompts/ARP_W1_CANON_PROMPT.md) | Канон 2D в docs/patterns + audit | **done** |
| **W2** | `arp-w2-engine` | [#1100](https://github.com/officefish/Membrana/issues/1100) | ozhegov | [`ARP_W2_ENGINE_PROMPT.md`](../../prompts/ARP_W2_ENGINE_PROMPT.md) | Агрегатор home/role/plane + тесты | **done** |
| **W3** | `arp-w3-surface` | [#1101](https://github.com/officefish/Membrana/issues/1101) | ozhegov | [`ARP_W3_SURFACE_PROMPT.md`](../../prompts/ARP_W3_SURFACE_PROMPT.md) | Render + Mintlify + провода | **done** |
| **W4** | `arp-w4-closure` | [#1102](https://github.com/officefish/Membrana/issues/1102) | vesnin | [`ARP_W4_CLOSURE_PROMPT.md`](../../prompts/ARP_W4_CLOSURE_PROMPT.md) | CLOSURE + archive | pending |

## Вне scope v1

- Rename/merge домов tasks ↔ audit/tasks.
- Мастерская для `scripts/` / включение в атлас.
- Пересмотр глаголов tasks-workshop V2.
- Новые контракты `@membrana/core`.

## Gate checklist (W0)

- [x] Слово владельца («ратифицирую») в шапке
- [x] Эпик + 5 фаз в registry + GitHub Issues #1097–#1102
- [x] `DAY_SPRINT_ACTIVE` → **Also open** (Focus `tasks-workshop` не трогать)
- [x] Номера Issue в таблице Phases
