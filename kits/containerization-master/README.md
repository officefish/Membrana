# containerization-master — кит Мастера контейнеризации

Третий жилец слоя [`kits/`](../README.md). Именованный набор инструментов, чтобы
агент в **холодной сессии** крафтил и аудитил контейнеры / киты, опираясь на два
паттерна и опыт действующих домов.

**Owner пина:** `ozhegov` (`leadPersona` в [`MANIFEST.json`](./MANIFEST.json)).  
**Автор крафта:** «Мастер контейнеризации» /
[`CONTAINERIZATION_MASTER_PROMPT.md`](../../docs/prompts/CONTAINERIZATION_MASTER_PROMPT.md)
(`CONTAINERIZATION_MASTER_VERSION` — не в pins).  
**Эпик:** `kits-containerization-master` (регистрация — фаза C0).

## Режимы

| Режим | Когда | Поведение |
|-------|--------|-----------|
| **latest** | интерактив, владелец рядом | дерево может быть новее; `yarn kits:audit --id containerization-master --mode latest` |
| **pinned** | autonomous / воспроизводимый крафт | только от пина; `yarn kits:audit --id containerization-master` |

Обновление пина — **отдельный** ревьюируемый коммит `MANIFEST.json`.

## Roots

| Root | yarn |
|------|------|
| `scripts/kits-audit.mjs` | `kits:audit` |
| `scripts/check-layer-direction.mjs` | `check:layer-direction` |
| `scripts/procedures-registry.mjs` | `procedures:registry` |
| `scripts/scripts-registry.mjs` | `scripts:registry` |
| `scripts/tooling-overview.mjs` | `tooling:overview` |
| `scripts/repo-branches.mjs` | `repo:branches` |
| `scripts/repo-branches-decompose.mjs` | `repo:branches:decompose` |
| `scripts/tasks-decompose.mjs` | `tasks:decompose` |
| `scripts/tasks-audit.mjs` | `tasks:audit` |

Замыкание (~21 узел) тянет `lib/kit-subgraph-audit`, `lib/validate-procedure`,
`lib/tasks-*`, `lib/repo-branches*`, `lib/tooling-overview`, … — зависимости CLI,
не копии контейнеров.

## Аудит

```bash
yarn kits:audit --id containerization-master
yarn kits:audit --id containerization-master --mode latest
```

## Чеклист PINNED_SUBGRAPH (этот кит)

1. ✅ Единица версии — подграф в `MANIFEST.json` (`pins`).
2. ✅ Пины — git blob SHA; копий нет.
3. ✅ Аудит — `yarn kits:audit --id containerization-master`.
4. ✅ Режимы latest/pinned — таблица выше.
5. ✅ Обновление пина — отдельный коммит манифеста.
6. ✅ Владелец пина — `leadPersona: ozhegov`.
7. ✅ Дрейф — табличный вывод audit.

## Процедура

[`docs/procedures/containerization/`](../../docs/procedures/containerization/) —
`kitVersion: kits/containerization-master`.

## Вне кита

| Что | Куда |
|-----|------|
| Паттерны GROUP_* / PINNED_* | `docs/patterns/` · precedents процедуры |
| `CONTAINERIZATION_MASTER_PROMPT.md` | precedents процедуры (нет static import `.md`) |
| `AGENT_PROMPT.md` целевых контейнеров | дома контейнеров; не pins |
| Mintlify pin `docs/audit/git/pins/` | движок git-кейсов; не этот кит |
| `procedure-frames` (#900) | соседний спринт `frames[]`; не глотать |

## Cold-start

1. [`CONTAINERIZATION_MASTER_PROMPT.md`](../../docs/prompts/CONTAINERIZATION_MASTER_PROMPT.md)
2. Этот README
3. Оба паттерна
4. Skill `membrana-containerization-master`
5. `yarn neighbors` → `yarn kits:audit --id containerization-master --mode latest`
