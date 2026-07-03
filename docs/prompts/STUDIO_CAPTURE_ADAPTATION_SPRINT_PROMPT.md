# Sprint prompt: Studio — адаптация к явному захвату (tariff v2), SC1–SC5

| Поле | Значение |
|------|----------|
| **Sprint** | `studio-capture-adaptation-2026-07-03` |
| **Registry epic** | `studio-capture-adaptation` |
| **Консилиум** | [`studio-capture-adaptation-2026-07-03.md`](../seanses/studio-capture-adaptation-2026-07-03.md) · бриф: [`STUDIO_CAPTURE_ADAPTATION_BRIEF.md`](../STUDIO_CAPTURE_ADAPTATION_BRIEF.md) |
| **Канон** | [`DEVICE_BOARD_SERVER_FIRST.md`](../DEVICE_BOARD_SERVER_FIRST.md) v2.0 (§10 отложенный Studio-скоуп) · [`STUDIO_HOST_BRIDGE_CONTRACT.md`](../STUDIO_HOST_BRIDGE_CONTRACT.md) |
| **Ограничение** | Оператор недоступен для ручных проверок до **~2026-07-17** (оборудование) — ручной smoke последней фазой, deferred |
| **Size** | M (программная часть) |

## Цель

Membrana Studio (Electron) — корректный полевой follower при явном захвате v2. Renderer = `apps/client` (v2-логика уже в main) — спринт закрывает Electron-специфику: таймер-троттлинг TTL, паритет хостов, программный smoke, доставку client-dist с маркером версии.

> Поправки к консилиуму (сверено с репо): TTL/heartbeat unit-тесты УЖЕ существуют — `apps/client/src/lib/boardLeaseBridge.test.ts` (CT4: capture/heartbeat-переармирование/release/TTL fake-timers), а не `packages/agenda/...` из реплики Математика. SC1 дополняет их только недостающим (release ровно один раз; focus-once). `background-office` из S5 = `background-cabinet`.

## Фазы

### SC1 — `backgroundThrottling` + focus при захвате (XS/S)

- [ ] `apps/membrana-studio/src/main.ts`: `webPreferences.backgroundThrottling: false` в `createWindow()` (статически — таймеры TTL/heartbeat живут в renderer).
- [ ] IPC `capture-acquired`: renderer (boardLeaseBridge, при `board.capture` своего устройства) → main → `mainWindow.focus()` — не чаще одного раза на acquire.
- [ ] Дополнить `apps/client/src/lib/boardLeaseBridge.test.ts`: release вызывается ровно один раз на TTL-разряд; повторный heartbeat после release не воскрешает.
- [ ] Preload: канал типизирован, без бизнес-логики в main (STUDIO_HOST_BRIDGE_CONTRACT §Принципы).

### SC3 — Паритет трёх хостов: §Capture в контракте (XS)

- [ ] `STUDIO_HOST_BRIDGE_CONTRACT.md` — новый §Capture: таблица browser follower / studio follower / cabinet захватчик × состояния (отпущено / soft / hard / connection-lost / release) × поведение (run/stop/edit/pause, badges, alerts, TTL).
- [ ] Autonomous studio (без WS): захват невозможен by design — зафиксировать строкой.

### SC4 — Smoke Studio-хоста, программная часть (S)

- [ ] `DEVICE_BOARD_CAPTURE_TARIFF_V2_SMOKE.md` — блок **§Studio (Electron)**: программные пункты (unit TTL, `yarn logs:parse` capture-lifecycle события, handshake c clientVersion) + ручные пункты с пометкой **deferred ~2026-07-17** (paired цикл, live fade/LWW слухом, VDR-плагин при захвате).
- [ ] `logs:parse`: фильтр/пороги capture-lifecycle (capture/heartbeat/release в shell-логах студии).
- [ ] UI-снапшот алертов/badges поверх борда в Studio (Rodchenko) — скриншот + при необходимости пример в DESIGN.md.

### SC5 — Доставка client-dist + маркер версии (M)

- [ ] Пересборка `client-dist` со свежим `apps/client` (v2 capture + VDR-плагин); diff-верификация: только изменения capture/HG-спринтов.
- [ ] `clientVersion` в WS-handshake paired-режима: renderer читает версию (`electronAPI.getAppVersion()` / build-манифест) → query-параметр handshake; `background-cabinet` логирует устаревшие сборки warning'ом (без strict gate — DR6).
- [ ] `desktop-studio.yml`: проверка «client-dist changed → rebuild & sign» (условная сборка, стыкуется с `dpr-dr6-client-delivery`).
- [ ] Тихая деградация старых сборок принята консилиумом (whitelist защищает сервер) — зафиксировать в PR-описании.

### SC-manual — Ручной smoke (deferred ~2026-07-17, M)

- [ ] Paired Studio + cabinet: capture/release/TTL/LWW/fade, badges/alerts.
- [ ] Слуховая проверка fade (Kuryokhin: нет артефактов на стыке).
- [ ] VDR-плагин при захвате.
- [ ] Итоги в smoke-runbook §Studio manual.

## Backlog (вне спринта, риски зафиксированы)

- **ST7: tray/global-shortcut emergency stop** при скрытом окне — GitHub risk-issue; инвариант §3.3 пока выполняется UI-кнопкой (Alt+Tab).
- **DR6**: strict версионный gate (маркер из SC5 — вход для него).
- Нативные нотификации при скрытом окне (OQ5 — отклонено для паритета с browser).

## DoD

- SC1/SC3/SC4/SC5 merged с LGTM; риск ST7 оформлен issue; ручные пункты smoke размечены deferred; `yarn turbo lint typecheck test build` зелёный.
