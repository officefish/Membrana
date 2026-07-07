```text
Tier: T2
Task: pcb-3-cabinet-liveness-indicator
Commit: af21abc0cc859a0e48d3a603051cbee2c6cbb854

[Teamlead]: Размер PR 87 строк, затрагивает 2 приложения (apps/cabinet, apps/client), 
критичен для PCB3 (живость присутствия + устойчивость к рестартам). Diff ограничен 
идемпотентностью connect и защитой от reconnect-петель при StrictMode/ре-рендерах. 
Все чеки проходят, тесты Present. LGTM при условии ревью ролей.

[Структурщик]: C1 — границы пакетов соблюдены (cabinet/client изолированы, общее наследование 
логики guard'а в openSocket). C3 — архитектура: идемпотентность (socket !== ws проверка) 
и вытеснение старого сокета — паттерн корректен. C4 — модульность: тесты покрывают 
idempotence и вытеснение. Нет нарушений структурных инвариантов. ✓

[Математик]: —

[Музыкант]: —

[Верстальщик]: —

P0/P1: —

P2:
  - apps/cabinet/src/lib/cabinetNodeRealtimeClient.ts:155–157 — гард `socket.readyState === 
    WebSocket.CONNECTING` логичен, но в тестах проверяется с моком; на боевом браузере убедиться, 
    что переход CONNECTING → OPEN не создаёт race (теоретически OK, но стоит монитора).
  - apps/client/src/lib/nodeRealtimeClient.ts:69–80 — аналог идемпотентности; 
    `this.pairing = pairing` дублируется (строка 69 и 80) — minor, но можно оптимизировать.

Checks:
  - git diff --check: pass (2026-07-04T18:40:07Z, SHA af21abc0)
  - Turbo unit tests: pass (2026-07-04T18:37:10Z)
  - Lint, typecheck, test, build: pass (2026-07-04T18:40:04Z)
  - verify: pass (2026-07-04T18:38:30Z)
  - Decide if studio affected: pass (2026-07-04T18:34:14Z)
  - Package Membrana Studio (Windows nsis): skipped
  - optional-review: skipped

Closure readiness: waiting_merge
Verdict: LGTM
```
