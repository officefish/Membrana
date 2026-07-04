```text
Tier: T2
Task: pl1-presence-snapshot
Commit: c515dc61e0f4b4cdbe7c62c5f9d238eceab06229

[Teamlead]: PL1 presence-snapshot: bootstrap контракт, сервер → снапшот при registerCabinet, 
клиент seeding + non-nulling при реконнекте. Diff ~320 строк, чистый, в DoD scope. 
Все checks pass (CI зелёный, no secrets/artifacts). P0/P1 не обнаружены. LGTM.

[Структурщик]: C1 ✓ (3 пакета: apps/cabinet, packages/{background-cabinet, core}; 
  контракт PresenceSnapshotPayload в core/events.ts + index.ts экспорт).
  C3 ✓ (NODE_REALTIME_EVENT_TYPES.presence.snapshot заведён в обоих слоях).
  C4 ✓ (parsePresenceSnapshotPayload дедупл. + валидация; присутствует в validate-payloads.ts).
  C7 ✓ (subscribePresenceSnapshot → handlers.add/delete; unsubSnapshot → cleanup в useCabinetNodeRuntime).

[Математик]: —

[Музыкант]: —

[Верстальщик]: —

P0/P1: —

P2: 
  - `useCabinetNodeRuntime.ts:65–72` — комментарий про "не обнуляем при реконнекте" удален 
    старый код, но логика явно не обнуляет (иначе узел мигал бы в offline). Заявленное 
    поведение зафиксировано; код корректен, однако читаемость могла бы выиграть от явного 
    assert/FIXME если реконнект когда-то будет требовать reset.
  - `node-realtime.service.ts:60` — `sendPresenceSnapshot` вызывается только при registerCabinet; 
    если подписка на presence.online/offline уже существует, snapshot может конкурировать с 
    событиями, прилетевшими между registerCabinet и первой подпиской клиента. Race мал, но 
    стоит задокументировать порядок подписок в `useCabinetNodeRuntime` явно.

Checks: 
  - git diff --check — pass (2026-07-04T16:59:37.503Z)
  - github-check:verify — pass (2026-07-04T16:57:24Z)
  - github-check:Turbo unit tests — pass (2026-07-04T16:53:06Z)
  - github-check:Lint, typecheck, test, build — pass (2026-07-04T16:55:51Z)
  - github-check:optional-review — skipped (не блокирует T2)

Closure readiness: ready
Verdict: LGTM
```
