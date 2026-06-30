# @membrana/tdoa-service

**WORK IN PROGRESS — frozen until stage-gate 1→2 passed.**

Извлечение TDOA и подготовка к мультилатерации — **Этап 2** дорожной карты
([`WHITE_PAPER.md`](../../../docs/WHITE_PAPER.md) §8). Активная разработка
приостановлена в пользу Single-Node Detection First.

Preserved-типы в `@membrana/core`: `SyncedTimestamp`, `TimeSyncProvider`, `TdoaResult`
(см. `packages/core/src/contracts/acoustic-network.ts`, `@experimental @stage 2`).

S1 specification: [`docs/architecture/tdoa-localization-contracts.md`](../../../docs/architecture/tdoa-localization-contracts.md).

Freeze boundary:

- TDOA pair estimation and localization contracts may be documented as `@experimental`.
- Runtime algorithms (GCC-PHAT, cross-correlation, multilateration) remain out of scope.
- Client, device-board, realtime gateway, and background service integration remain forbidden until stage-gate 1→2 passes.

Milestone GitHub: **Stage 2 — Network**.
