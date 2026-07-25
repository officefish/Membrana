---
name: membrana-leveling
description: >-
  Membrana evening workspace leveling: dirty→ctx snapshot, disposition gate,
  workspace-level report, optional owner-gated main-fill (pr:ship train). Use when
  user says leveling, выравнивание, membrana-leveling, вечерний leveling,
  unnamed-trash, workspace-level, or asks to level the worktree.
  Do NOT use for morning ritual (membrana-morning-ritual), silent pr:ship without
  owner OK, or inventing inActiveSession from mtime.
---

# Membrana Leveling

Канон: [`MEMBRANA_LEVELING_REGULATION.md`](../../../docs/prompts/MEMBRANA_LEVELING_REGULATION.md) ·
процедура: [`docs/procedures/membrana-leveling/`](../../../docs/procedures/membrana-leveling/)
(`README` / [`DISPOSITION.md`](../../../docs/procedures/membrana-leveling/DISPOSITION.md) /
[`SCRIPTS.md`](../../../docs/procedures/membrana-leveling/SCRIPTS.md)) ·
шов соседям: [`docs/HANDOFF.md`](../../../docs/HANDOFF.md).

## When to use

- Триггеры: «leveling», «выравнивание», `membrana-leveling`, вечерний leveling,
  unnamed-trash / workspace-level.
- Нужно классифицировать dirty-пути и показать STOP/PASS + три раздела отчёта.
- Есть ready-очередь и владелец явно просит влить в `main` (после «ок»).

## When NOT to use

- Утро → `membrana-morning-ritual`.
- Пин фреймов / `segmentHash` → эпик `#900` (`procedure-frames`), не здесь.
- Silent `pr:ship` / `--execute` без слова владельца.
- Подмена порта `inActiveSession` эвристикой mtime (только явный overlay/флаг).

## Playbook

1. `yarn neighbors` — кто держит ветки / не коллизить дерево.
2. Снимок: `yarn membrana-leveling:snapshot --out <snap.json>`  
   (опционально `--ctx overlay.json` для `registered` / `inActiveSession` / `leadStamp`).
3. Гейт + отчёт: `yarn membrana-leveling:workspace-level --snapshot <snap.json> --out report.md`  
   (без ready — ок; при ready без ship-флага CLI откажется — это норма).
4. Показать владельцу: статус STOP/PASS, reasons, три раздела отчёта, план ready-очереди.
5. **Только после явного «ок»:** `yarn membrana-leveling:main-fill …` / workspace-level
   с `--ship-ok` и реальным inject (не из вечернего soft-шага).

Вечерний ритуал зовёт soft-шаг `leveling-workspace` через манифест
(`docs/tasks/evening-ritual-steps.json`) — план + отчёт, **без** авто-merge.
Ручной leveling дерева → этот skill, не дублировать логику в `membrana-developer-rhythm`.

## Agent rules

- Скилл **ссылается** на regulation/procedure — не копирует disposition order.
- Soft evening finding (STOP) не роняет `team-evening-feedback`.
- Отчёт вечера: `docs/seanses/workspace-level-<date>.md` — ссылка для HANDOFF.
