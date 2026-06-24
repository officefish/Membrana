# Teamlead review: Playback cluster transport control

> **Branch:** `experiment/playback-cluster-control`  
> **Пакет:** `@membrana/device-board`  
> **Дата:** 2026-06-22

---

## Scope

Объединённый toolbar-кластер **Play · Pause · Stop** (DaisyUI `join`):

| Режим | Play | Pause | Stop |
|-------|------|-------|------|
| Edit | lit | dim | dim |
| Running | dim (бывш. active) | lit | lit |
| Paused | lit (resume) | dim | lit |
| Stop → edit | lit | dim | dim |

- Play = Run / Resume, подпись всегда «Play»
- Визуал: `lit` / `dim` / `depressed` (depressed = dim, без тёмного inset)
- Aperture glow только на `lit`
- Логика: `playback-cluster-control.logic.ts` + 4 unit-теста

---

## Smoke

| # | Check | Result |
|---|-------|--------|
| 1 | `yarn workspace @membrana/device-board test playback-cluster` | green |
| 2 | Shell wiring `onStart/onResume/onPause/onStop` | OK |
| 3 | Регрессия pause runtime (DBP0 smoke) | existing tests |

---

## Виртуальная команда

```text
[Teamlead — Vesnin]:
Tier T1 UI experiment. Границы пакета OK; runtime API не менялся.
Lit/dim/depressed читаемо; a11y title/aria на Play contextual.
Вердикт: **LGTM** — merge в main.

[Rodchenko]:
DESIGN tokens + join; dim/depressed без «мыла». Follow-up: icon-only на узких экранах.

[Ozhegov]:
Логика в .logic.ts — тестируемо. Shell только замена кнопок.

[Структурщик]:
Нет новых deps. CSS co-located.
```

---

## Итог

**LGTM** · merge после CI green.
