# Cowork Sprint Active

| Поле | Значение |
|------|----------|
| **status** | `open` — Phase 4 закрыта, Phase 5 (один PR в main) |
| sprintId | `cowork-library-open-api` |
| brief | [`COWORK_SPRINT_BRIEF.md`](./cowork-sprint/cowork-library-open-api/COWORK_SPRINT_BRIEF.md) |
| вход | заседание [`library-open-api/EPIC.md`](./meeting/library-open-api/EPIC.md), ред. 3, влито `4eba2c77` |
| BASE_SHA | `56423801` (= origin/main на момент открытия) |
| openedAt | 2026-09-02 |
| owner cut ratification | формат — слово владельца 02.09 («коворк по слову владельца»); нарезка на три блока ожидает ратификации |
| current phase | **5 — Merge + archive** |
| integration deadline | 2026-09-05 fallback (гейт событийный) |
| координатор | сессия Б |

## Blocks

| Блок | Ветка | Worktree | Фаза | Готовность |
|------|-------|----------|------|------------|
| `ownership` | `cowork/cowork-library-open-api/ownership` | `Membrana-ownership` | freeze | `de0005f8`; 67 зубов, порча мутацией |
| `contract` | `cowork/cowork-library-open-api/contract` | `Membrana-contract` | freeze | `b047a20e`; 29→31 зуб, порча мутацией |
| `key-ttl` | `cowork/cowork-library-open-api/key-ttl` | `Membrana-key-ttl` | freeze | `d59409dd`; 80 зубов, порча живого файла |

Все три ветки заведены от одного `BASE_SHA 56423801`; freeze-теги стоят.
Integration-ветка: `cowork/cowork-library-open-api/integration` в дереве `Membrana-integration`.

## Что НЕ входит

**M4 — границы выемки (квота выдачи на мембрану).** Эпик называет квоту нормой к вводу, а не
действующей границей: счётчика выдач и предела частоты в стволе нет, предел фактически
бесконечен. Блок с нерешённым носителем резать нельзя.

## Известный шов — намеренно не согласован

Имя временного поля ключа: M2 назвал рабочее `trackUrl`, лемма M4 записала `temporaryKey?`.
Назначать до вскрытия запрещено — каждый блок объявляет ожидание односторонне в своём
`EXPECTATIONS.md`. Сведение — Phase 3.

## Phase Ledger

| Фаза | Состояние | Дата | Артефакт |
|------|-----------|------|----------|
| 0 — Brief + open | ✅ закрыта | 2026-09-02 | brief, ACTIVE, 3 ветки от `56423801` |
| 1 — Concept | ✅ закрыта | 2026-09-02 | три `CONCEPT.md` + первые `EXPECTATIONS.md` |
| 2 — Isolated build | ✅ закрыта | 2026-09-02 | все три DoD зелёные на стабах; гейт сработал по предикату, дедлайн не понадобился |
| 3 — Interface Consilium | ✅ закрыта | 2026-09-02 | протокол + `INTERFACE_CONTRACT.md`; шов имени решён, число полей — владельцем |
| 4 — Integration | ✅ закрыта | 2026-09-02 | 7 адаптеров, smoke 6/6 через все три шва |
| 5 — Merge + archive | в работе | — | один PR в main, `RETROSPECTIVE.md` написана |

## Сверено в стволе до нарезки (02.09)

| Факт | Состояние |
|------|-----------|
| `Device.membraneId` | есть, `prisma/schema.prisma:54`, с индексом |
| `MediaDeviceAccessGuard` | есть, охрана маршрута |
| OpenAPI-спецификация библиотеки | нет |
| Генератор ключей треков, `DEFAULT_TRACK_KEY_TTL` | нет нигде в стволе |

Отсюда: `ownership` строит ось выборки на существующем поле; `contract` и `key-ttl` создаются
с нуля.
