---
name: membrana-containerization-master
description: >-
  Cold-start playbook for Membrana containerization craft: two patterns
  (GROUP_CONTAINERIZATION + PINNED_SUBGRAPH), lessons from live containers, and
  kit tools (kits:audit, procedures:registry, scripts/tasks/git decompose). Use when
  user asks for containerization master, new container, procedures container organs,
  kit scaffolding, or starts a fresh session on containers/kits. Do NOT use for
  procedure-frames frames[] sprint (#900) or Mintlify branch-instruction pins.
---

# Membrana — Мастер контейнеризации

## Cold-start (обязательный порядок)

1. [`docs/prompts/CONTAINERIZATION_MASTER_PROMPT.md`](../../../docs/prompts/CONTAINERIZATION_MASTER_PROMPT.md) — роль + версия
2. [`kits/containerization-master/README.md`](../../../kits/containerization-master/README.md) — tools / modes
3. Паттерны: [`GROUP_CONTAINERIZATION`](../../../docs/patterns/GROUP_CONTAINERIZATION.md) → [`PINNED_SUBGRAPH_VERSIONING`](../../../docs/patterns/PINNED_SUBGRAPH_VERSIONING.md)
4. Процедура: [`docs/procedures/containerization/`](../../../docs/procedures/containerization/)
5. `yarn neighbors` — не пересечь `procedure-frames` (#900) и чужие ACTIVE
6. `yarn kits:audit --id containerization-master --mode latest`

## When to use

- Новая сессия: «собери контейнер», «как git/tasks», «кит под крафт»
- Достройка органов контейнера (README / registry / cache / AGENT_PROMPT / tools)
- Новый жилец `kits/<id>/` по PINNED_*
- Аудит дрейфа китов / layer-direction / procedures registry

## When NOT to use

- Спринт `procedure-frames` (`frames[]`, пин отрезков) — отдельный скоуп #900
- Пин Mintlify cookbooks в `docs/audit/git/pins/` — не `kits/`
- Массовая архивация tasks / `repo:clean --execute` без ok владельца
- Код продукта client/services — другие skills

## Tools (kit roots)

```bash
yarn kits:audit --id containerization-master
yarn check:layer-direction
yarn procedures:registry [--check]
yarn scripts:registry --report
yarn tooling:overview --report
yarn repo:branches
yarn repo:branches:decompose --report …
yarn tasks:decompose --report …
yarn tasks:audit
```

Пины: [`kits/containerization-master/MANIFEST.json`](../../../kits/containerization-master/MANIFEST.json).

## Hard rules

- Контейнеры **не** пинятся целиком (вердикт владельца 21.07).
- В `kits/` и `docs/procedures/<id>/` — **нет** кода/тестов.
- HARD GATE опасных сценариев — параметр только в **текущем** сообщении.
- Эпик оснащения: [`KITS_CONTAINERIZATION_MASTER_PROMPT.md`](../../../docs/prompts/KITS_CONTAINERIZATION_MASTER_PROMPT.md).
