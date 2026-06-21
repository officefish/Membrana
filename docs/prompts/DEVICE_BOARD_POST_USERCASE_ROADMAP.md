# Roadmap: device-board после UserCase MVP (v0.8 LGTM)

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** `id` = **`db-post-usercase-roadmap`**  
> **Предшественник:** [`USERCASE_MVP_MICROPHONE_LGTM.md`](../device-board-scripts/USERCASE_MVP_MICROPHONE_LGTM.md) (2026-06-21)  
> **Ветка:** feature-ветки от `vesnin`; UX/docs — обычные PR, server — с `background-media`

**Статус:** **active** — UserCase MVP microphone **достигнут**; этот документ — план работ **после** parity A+B.

---

## Контекст

Device-board впервые выполняет полный **UserCase MVP microphone** на live runtime:

- bundled `usercase-mvp-microphone` (6 branches);
- recording gate + `MakeRecordingPolicy` / `MakeFftTrendsPolicy`;
- journal `trends-fft/v0.1` + track upload async.

Дальше продукт смещается от «доказать граф» к **удобству редактора**, **канонической документации** и **серверному persist**.

---

## Три направления

### U — Usability (device-board shell + graph UX)

**Цель:** сценарий можно собирать и отлаживать без JSON-import и без чтения chain-log.

| Приоритет | Тема | Ориентир / существующий промпт |
|-----------|------|--------------------------------|
| U1 | UserCase picker / «Загрузить MVP» в shell | § Future в Recording parity v0.8 |
| U2 | Policy inspectors parity с plugin sidebar | MakeRecordingPolicy / MakeFftTrendsPolicy ✓ частично |
| U3 | Port labels, header, branch titles RU | [`DEVICE_BOARD_UX_PORTS_HEADER_PROMPT.md`](./DEVICE_BOARD_UX_PORTS_HEADER_PROMPT.md) |
| U4 | Run controls: pre-run validation UX, trace export discoverability | chain trace P0–P3 |
| U5 | CollectFftFrames append-only vs flush — подсказка в inspector | post-fix 2026-06-21 |
| U6 | Manual save / dirty state / branch import modal polish | [`DEVICE_BOARD_MANUAL_SAVE_PROMPT.md`](./DEVICE_BOARD_MANUAL_SAVE_PROMPT.md) |
| U7 | ~~Pure Getters (Blueprint parity)~~ **LGTM** | [`PURE_GETTERS_LGTM.md`](../device-board-scripts/PURE_GETTERS_LGTM.md) |
| U8 | Canvas: marquee, groups, user functions, align MVP | [`DEVICE_BOARD_CANVAS_GROUPS_FUNCTIONS_EPIC_PROMPT.md`](./DEVICE_BOARD_CANVAS_GROUPS_FUNCTIONS_EPIC_PROMPT.md) |
| U8a | Node align advanced (snap, guides, dagre) | `db-node-align-advanced` (отдельный эпик) |

**DoD направления U:** новый оператор открывает microphone board → видит MVP → Run → journal entry **без** ручного import JSON.

---

### D — Documentation snapshot (канон v0.8)

**Цель:** один источник правды о **текущем** состоянии board, не D0 hackathon и не v07 draft.

| Приоритет | Артеfact | Действие |
|-----------|----------|----------|
| D1 | `DEVICE_BOARD_CONCEPT.md` §16.5 | ~~Обновить диаграмму под v0.8~~ ✓ v0.9 (Pure Getters G4) |
| D2 | `USERCASE_MVP_MICROPHONE.md` | LGTM banner + ссылка на sign-off |
| D3 | `docs/catalog/client/` | promptPath для device-board module (если отсутствует) |
| D4 | Node palette / socket types table | Синхрон с `@membrana/core` CONSTRUCTOR + gate kinds |
| D5 | Cookbook | [`SCENARIO_CHAIN_LOG_COOKBOOK.md`](../device-board-scripts/SCENARIO_CHAIN_LOG_COOKBOOK.md) — v08 main loop default |
| D6 | Package README | `packages/device-board/README.md` — UserCase MVP + yarn scripts |

**DoD направления D:** разработчик без чата находит «как устроен MVP» за ≤10 мин только по `docs/` + CONCEPT.

---

### S — Server support (background-media)

**Цель:** `device-scenario` document и persist board — не только localStorage; pairing + remote journal path.

| Приоритет | Тема | Ориентир |
|-----------|------|----------|
| S1 | `GET/PUT .../device-scenario` контракт | [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md), `background-media` DeviceScenariosModule |
| S2 | Client `DeviceBoardPersistAdapter` → media-server mode | уже есть hook; довести E2E с MVP document |
| S3 | LWW / conflict при двух редакторах | platform consilium 2026-06-17 |
| S4 | Swagger A5d + deploy A5c | `background-media-a5d-swagger`, `background-media-a5c-deploy` |
| S5 | Telemetry report upload parity (track blob + journal) | media library + journal pagination |

**DoD направления S:** два браузера / reinstall — сценарий восстанавливается с server; Run пишет в cloud journal (remote mode).

**Граница:** office (Claude/Linear) **не** хранит scenario JSON — только `background-media`.

---

## Предлагаемый порядок (Teamlead)

```text
Sprint 1 (docs + quick UX):  D1 D2 D5  +  U3 U6
Sprint 2 (usability):         ~~U7 Pure Getters~~ ✓ → **U8** groups/functions → U1 U3 U4 U5
Sprint 3 (server):            S1 S2 → S3 S4
```

Параллельно: optional live A/B plugin vs graph (B3 deferred).

---

## Регистрация задач

При старте работ создавать дочерние задачи в реестре:

| id (draft) | Направление |
|------------|-------------|
| `db-post-usercase-u1-mvp-picker` | U1 |
| `db-post-usercase-d1-concept-165` | D1 |
| `db-post-usercase-s1-scenario-api` | S1 |
| `db-pure-getters-blueprint-parity` | U7 proposal #1 (parent epic) |
| `db-pure-getters-p0-spec-lgtm` | P0 pure getters spec |
| `db-canvas-groups-functions` | U8 parent epic |
| `db-node-align-advanced` | U8a exec dagre + snap guides | [`DEVICE_BOARD_NODE_ALIGN_ADVANCED_EPIC_PROMPT.md`](./DEVICE_BOARD_NODE_ALIGN_ADVANCED_EPIC_PROMPT.md) |

Родитель: **`db-post-usercase-roadmap`**.

---

## Мнение команды (planning)

```text
[Teamlead — Vesnin]:
UserCase LGTM — milestone, не релиз cabinet. Следующий ROI: UX (U) + docs (D) перед server (S).

[Структурщик — Ozhegov]:
CONCEPT §16.5 устарел (device-board-observation/v1, windowSec=3). D1 обязателен до новых nodeKind.

[Верстальщик — Rodchenko]:
U1 + U3 снимут боль import JSON; inspectors уже есть — polish labels/tooltips.
U7 Pure Getters — первый proposal: sidebar value edit + exec-free policy wires.

[Service — background-media]:
S1 reuse DeviceScenariosService; seed MVP document on first PUT если пусто.
```
