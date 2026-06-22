# Playback cluster transport control (Play · Pause · Stop)

> **Ветка:** `experiment/playback-cluster-control`  
> **LGTM:** [`playback-cluster-control-teamlead-lgtm-2026-06-22.md`](./playback-cluster-control-teamlead-lgtm-2026-06-22.md)  
> **Статус:** merged to main (2026-06-22)

---

## Поведение

DaisyUI `join` · Play = Run/Resume · Stop в том же кластере.

| Режим | Play | Pause | Stop |
|-------|------|-------|------|
| Edit | **lit** | dim | dim |
| Running | dim | **lit** | **lit** |
| Paused | **lit** | dim | **lit** |

Визуал: **lit** (aperture) · **dim** (приглушённо) · depressed = dim без inset.

## Файлы

- `packages/device-board/src/components/playback-cluster-control.{tsx,css,logic.ts,test.ts}`
- `device-board-shell.tsx` — wiring

## Verify

```bash
yarn workspace @membrana/device-board test playback-cluster
```
