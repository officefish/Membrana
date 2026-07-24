---
name: membrana-containerization-master
description: >-
  Cold-start playbook for Membrana containerization craft: three patterns
  (GROUP_CONTAINERIZATION space + PINNED_SUBGRAPH time/identity + HOME_WORKSHOP
  operations), the meta level (container of containers — tooling-atlas, 2D procedures
  home), lessons from live containers, and kit tools (kits:audit, tooling:atlas,
  procedures:registry, scripts/tasks/git decompose). Use when user asks for
  containerization master, new container, container of containers, procedures container
  organs, kit scaffolding, home workshop verbs, or starts a fresh session on
  containers/kits. Do NOT use for procedure-frames frames[] sprint (#900) or Mintlify
  branch-instruction pins.
---

# Membrana — Мастер контейнеризации

## Cold-start (обязательный порядок)

1. [`docs/prompts/CONTAINERIZATION_MASTER_PROMPT.md`](../../../docs/prompts/CONTAINERIZATION_MASTER_PROMPT.md) — роль + версия
2. [`kits/containerization-master/README.md`](../../../kits/containerization-master/README.md) — tools / modes
3. **Три паттерна** ([`docs/patterns/`](../../../docs/patterns/README.md)) — три ортогональные оси одного узора «дом и его оснастка»:

   | Ось | Паттерн | Про что |
   |-----|---------|---------|
   | Пространство | [`GROUP_CONTAINERIZATION`](../../../docs/patterns/GROUP_CONTAINERIZATION.md) | где живёт группа, кто пишет, что коммитить; пять органов (контракт · реестр · кеш · инструменты · агент) |
   | Время / идентичность | [`PINNED_SUBGRAPH_VERSIONING`](../../../docs/patterns/PINNED_SUBGRAPH_VERSIONING.md) | какая ревизия оснастки; единица версии — подграф, пины git SHA (кит — файл, фрейм — отрезок) |
   | Операции | [`HOME_WORKSHOP`](../../../docs/patterns/HOME_WORKSHOP.md) | чем над домом работают: инвентарь `audit` · `decompose` · `inspectElement` (MUST покрытия **дома**; пара может жить в соседнем контуре — g0 V2) |

   Стороны разные: контейнер — **пространство**, кит — **поставка**, мастерская — **спрос**.
4. Мета-уровень — раздел ниже (контейнер контейнеров)
5. Процедура: [`docs/procedures/containerization/`](../../../docs/procedures/containerization/)
6. `yarn neighbors` — не пересечь `procedure-frames` (#900) и чужие ACTIVE
7. `yarn kits:audit --id containerization-master --mode latest`

## Мета-уровень — контейнер контейнеров

Контейнер, чей **элемент = целый контейнер**. Таких два, и они разного охвата:

| Дом | Что группирует |
|-----|----------------|
| [`docs/tooling-atlas/`](../../../docs/tooling-atlas/README.md) | **все дома вообще** — рекурсивно, включая процедурный и себя; агрегирует README + `workshop.manifest.json` каждого контейнера в производный индекс, своих описаний не держит (копия = эхо-дрейф) |
| [`docs/procedures/`](../../../docs/procedures/) | процедуры; **двумерный** дом (список процедур × собственный список каждой) |

Практическое следствие: **плоский инструмент на неплоском доме ломается** — это дефект №2
паттерна [`HOME_WORKSHOP`](../../../docs/patterns/HOME_WORKSHOP.md). Прежде чем писать
инструмент, проверь размерность дома. У каждой процедуры свой якорный документ — база
рекурсии, спуск конечен.

Инвентарь домов и здоровье их мастерских — `yarn tooling:atlas --audit`.

## When to use

- Новая сессия: «собери контейнер», «как git/tasks», «кит под крафт»
- Достройка органов контейнера (README / registry / cache / AGENT_PROMPT / tools)
- Мастерская дома: три глагола по `HOME_WORKSHOP`
- Новый жилец `kits/<id>/` по PINNED_*
- Вопрос про контейнер контейнеров / общую документацию по туллингу
- Аудит дрейфа китов / layer-direction / procedures registry / атласа

## When NOT to use

- Спринт `procedure-frames` (`frames[]`, пин отрезков) — отдельный скоуп #900
- Пин Mintlify cookbooks в `docs/audit/git/pins/` — не `kits/`
- Массовая архивация tasks / `repo:clean --execute` без ok владельца
- Код продукта client/services — другие skills

## Tools (kit roots)

```bash
yarn kits:audit --id containerization-master
yarn tooling:atlas --audit                      # инвентарь всех домов + здоровье мастерских
yarn tooling:atlas --decompose --by family|holder|kit
yarn tooling:atlas --inspect <home>             # один контейнер вглубь
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

- Контейнеры **не** пинятся целиком (вердикт владельца 21.07): пинится сабграф ПОД
  контейнером, снимковая дисциплина реестра — вне `PINNED_SUBGRAPH`.
- Атлас и любой мета-дом **агрегируют**, не копируют: источник истины — README +
  `workshop.manifest.json` каждого контейнера.
- В `kits/` и `docs/procedures/<id>/` — **нет** кода/тестов.
- HARD GATE опасных сценариев — параметр только в **текущем** сообщении.
- Эпик оснащения: [`KITS_CONTAINERIZATION_MASTER_PROMPT.md`](../../../docs/prompts/KITS_CONTAINERIZATION_MASTER_PROMPT.md).
