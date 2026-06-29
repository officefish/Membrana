# INSIGHT: Dual-density UI — operator vs engineer mode

| Поле | Значение |
|------|----------|
| **ID** | `insight-rodchenko-operator-density-mode` |
| **Статус** | adopted |
| **Источник** | virtual-team-rodchenko |
| **Создан** | 2026-06-25 |

---

## Проблема / наблюдение (Родченко)

32-node main canvas + полная палитра перегружают **оператора** (C7 async clarity). User insights (slides, scenario builder Usability first) требуют **два режима плотности** без двух приложений.

## Гипотеза

**Dual-density** toggle в device-board chrome:

| Режим | Canvas | Palette | Inspector |
|-------|--------|---------|-----------|
| **Engineer** | full nodes, all pins | full | technical |
| **Operator** | collapsed functions visible, semantic frames | filtered «operator» subset | journey copy |

Persist per UserCase fork; tokens из `DESIGN.md`. Связь с Slide present mode (read-only operator).

## Scope

- In: toggle, CSS density tokens, palette filter profile
- Out: separate app shell

## Связи

- `insight-async-v2-product-narrative`, `insight-slide-fullscreen-presentation`, `DESIGN.md`
