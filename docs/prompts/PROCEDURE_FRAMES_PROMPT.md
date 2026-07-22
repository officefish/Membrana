# Промпт: Спринт «фреймы» — исполнение ратифицированного заседания procedure-frames

> **L** · `procedure-frames` · [#900](https://github.com/officefish/Membrana/issues/900) · epic lead **ozhegov**, support **dynin**  
> Цепь: F0→F5 (#926–#931). Роли **пофазовые** (F2 lead = dynin; F5 lead = vesnin).  
> **Канон вердиктов (РАТИФИЦИРОВАН 22.07):** [`docs/meeting/procedure-frames/EPIC.md`](../meeting/procedure-frames/EPIC.md)  
> **Раскладка утра (РАТИФИЦИРОВАН 22.07, #939):** [`docs/meeting/ritual-day-frames/EPIC.md`](../meeting/ritual-day-frames/EPIC.md)  
> Вход шторма: [`storm-cold-start-entry-2026-07-22`](../storm/storm-cold-start-entry-2026-07-22/THESES.md)  
> OPEN: [`docs/day-sprint/procedure-frames-2026-07-22/OPEN.md`](../day-sprint/procedure-frames-2026-07-22/OPEN.md)  
> Заседания: **закрыты**; этот спринт — **исполнение**, не пересборка комнаты.  
> ADR формы пина: [`ADR-0015`](../adr/ADR-0015-frame-pins-array-shape.md) (F0, **ACCEPTED** 22.07).

---

## Контекст

Заседание `procedure-frames` зафиксировало Ф1–Ф4. Старый тонкий промпт (#900) описывал намерение
до комнаты; **источник истины исполнения — EPIC + протоколы m1–m4**. Цель спринта: довести
сущность процедуры до механики в коде и доках так, чтобы по прецеденту 22.07 фрейм и лицо
находились без раскопок, а дрейф отрезка двери ловился аудитом.

## Границы

| Лемма | Адрес | Не путать |
|-------|--------|-----------|
| **Контракт frames** | optional-ключ поверх пятиполёвки Р1 | шестое обязательное поле |
| **Пин отрезка** | `{path, anchor, segmentHash}` | пин целого файла кита |
| **Единое ядро** | `auditPins(pins, resolveSegment)` | близнец `kit-subgraph-audit` |
| **Первый фрейм** | `morning-wiring` @ `ritual-day` · holder ozhegov · носитель **preflight** (не `frames[0]`) | чинить утро инлайн без адреса |
| **Пин фрейма** | `pins?: Pin[]` (ADR-0015) | скаляр `pin?` в записи (только transitional-read) |
| **Раскладка утра** | полная очередь в EPIC ritual-day-frames; `D_live` после зубьев | писать frames в MANIFEST до F1–F3 |
| **Контейнер** | сам **не** пинится (снимковая дисциплина) | сабграф ПОД контейнером — законный адресат |
| **Грамматика веток** | чужой скоуп (#785) | не трогать в этом спринте |

**Запрещено:** пересматривать тезисы T1–T11 / вердикты M1–M4; пинить контейнер целиком;
тащить целые документы в подграф; параллельный движок аудита фреймов.

**Соседи:** `kits-containerization-master` (закрыт) · `procedural-layer-impl` (#781) ·
`kits:audit` / PINNED_* · `morning-wiring-hotfix` (#902, уже трогал двери).

## Фазы исполнения

| Фаза | id | Issue | size | lead | Суть | Канон |
|------|-----|------:|------|------|------|-------|
| **F0** | `pf-f0-brief` | [#926](https://github.com/officefish/Membrana/issues/926) | S | ozhegov | Синхрон промпта/OPEN с EPIC(+ritual-day-frames); **ADR-0015** `pins[]`; хвост №3 → `precedents[]` | EPIC §хвосты 1, 3 |
| **F1** | `pf-f1-frames-contract` | [#927](https://github.com/officefish/Membrana/issues/927) | M | ozhegov | очередь optional (`preflight`/`frames`/`post` или эквивалент); элемент `{id, holder, pins?}`; P1∧P2∧P3; живущие валидны без очереди | m1 + rdf M2/M5 |
| **F2** | `pf-f2-segment-pin` | [#928](https://github.com/officefish/Membrana/issues/928) | M | dynin | Ядро `auditPins` + `resolveSegment`; segmentHash; кит на том же ядре | m2 |
| **F3** | `pf-f3-morning-wiring` | [#929](https://github.com/officefish/Membrana/issues/929) | M | ozhegov | `morning-wiring` в **preflight**; 3 двери (`pins`×3); гейт на старте утра | m3 + rdf M2 |
| **F4** | `pf-f4-pattern` | [#930](https://github.com/officefish/Membrana/issues/930) | S | ozhegov | Уточнение PINNED_* / GROUP_* (`copies=1`) | m4 |
| **F5** | `pf-f5-closure` | [#931](https://github.com/officefish/Membrana/issues/931) | S | vesnin | CLOSURE + archive; хвост №2 — отдельная карточка dynin или deferred | EPIC |

### Рекомендуемый порядок PR

Issue #900 просит «один PR в main». Практика day-sprint допускает:

| Вариант | Когда |
|---------|--------|
| **A (предпочтительный)** | F0 (ADR) отдельным мелким PR → **один delivery PR** F1+F2+F3+F4 → F5 archive |
| **B** | Пофазовые PR, если delivery раздувается >~400 LOC / конфликт с соседями |

Не смешивать F5 archive с delivery без LGTM ozhegov на DoD #900.

## Хвосты заседания → спринт

| # | Хвост | Куда |
|---|--------|------|
| 1 | Форма поля пина (один vs три) | **F0 ADR** (ниже консилиум-гейта) |
| 2 | CI-зуб анти-дубль оговорки GROUP_* | Отдельная задача lead **dynin** (не блокер F5, можно deferred) |
| 3 | Прецедент 22.07 в `precedents[]` | **F0**: файл в main — `docs/precedents/2026-07-22-…cold-start-autostart.md` → добавить в `ritual-day` `precedents[]` |
| 4 | Шов preflight vs Ф3 `frames[0]` | **F3**: дом = preflight (EPIC ritual-day-frames); двери/holder без изменений |

## Out of scope

- Переоткрытие заседания / новые вердикты
- Полная декомпозиция всех процедур на фреймы (только первый живой + контракт)
- Грамматика веток (#785)
- Night Build / ласточка / ценностный доклад утра (#788)

## Acceptance (эпик = Issue #900)

- [ ] По прецеденту 22.07 фрейм `morning-wiring` и holder `ozhegov` читаются из `ritual-day` MANIFEST без раскопок
- [ ] Дрейф/пропажа отрезка двери ловятся `auditPins` (таблица + глагол ремонта); `missing` ≠ молчание
- [ ] Delivery в main (вариант A или B) + LGTM Teamlead
- [ ] `yarn` зубы: `validateProcedure` / тесты `auditPins` / `kits:audit` не сломан
- [ ] Фазы архивированы; CLOSURE в `docs/day-sprint/procedure-frames-*/`

## Cold-start исполнителя

1. [`EPIC.md`](../meeting/procedure-frames/EPIC.md) целиком  
2. [`ritual-day-frames/EPIC.md`](../meeting/ritual-day-frames/EPIC.md) — очередь утра / preflight / `D_live`  
3. Протоколы m1→m4 по фазе (+ rdf M2 при F3)  
4. Этот промпт + Issue #900 + ADR-0015  
5. `yarn neighbors` (не пересечь active соседей)  
6. Skill `membrana-containerization-master` — паттерны ортогональны, не глотать frames в кит
