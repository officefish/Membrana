# Задание заседания: утренний ритуал → очередь фреймов

> **Заседание:** `ritual-day-frames` · заведено 2026-07-22  
> Основание: слово владельца («как переложить утренний ритуал на фреймы») после
> открытия спринта исполнения [`procedure-frames`](../procedure-frames/EPIC.md) (#900).  
> Председатель: агент сессии. Аудитор: **отдельный** агент, read-only (S-M5).  
> Владелец: druid. Задание после M0 меняется только через `BRIEF_AMENDMENT.md` + LGTM.

---

## Объединяющее задание

**Разложить процедуру утреннего ритуала (`ritual-day` + кит `angelina-morning` +
соседние шаги после артефакта) в полную очередь фреймов с лицами и границами
относительно уже решённого `morning-wiring` — так, чтобы исполнение не спорило с
контрактом frames из заседания `procedure-frames`, а агент холодной сессии видел
сценарий утра как цепочку кадров с ответственными, а не как плоский список yarn.**

Одно на все вопросы заседания.

---

## Вход

- Заседание-канон контракта: [`procedure-frames/EPIC.md`](../procedure-frames/EPIC.md)
  (РАТИФИЦИРОВАН 22.07) · спринт исполнения [#900](https://github.com/officefish/Membrana/issues/900)
  · OPEN [`procedure-frames-2026-07-22`](../../day-sprint/procedure-frames-2026-07-22/OPEN.md).
- Процедура: [`docs/procedures/ritual-day/`](../../procedures/ritual-day/)
  (`leadPersona: angelina`, `kitVersion: kits/angelina-morning`).
- Кит: [`kits/angelina-morning/`](../../../kits/angelina-morning/) — 13 roots цепочки
  `yarn ritual:day` + swallow/hermes.
- Цепочка в `package.json` `"ritual:day"`: morning-care → worktree-sync → repo-clean →
  deps-watch → plan-week-if-monday → strategy-day → standup → main-day-probe →
  main-day-issue → angelina (ласточка/hermes — после артефакта, вручную).
- Прецеденты утра: `docs/precedents/2026-07-21-morning-ritual-*`,
  `docs/precedents/2026-07-22-*-cold-start-autostart.md`.
- Skill/ритуал: `membrana-morning-ritual` · `docs/DEVELOPER_RHYTHM.md`.

---

## Решено ранее — переспорить нельзя

Из шторма / заседания `procedure-frames` (посылки, не переоткрывать):

- Процедура = очередь фреймов, полная декомпозиция (T6).
- Фрейм = элемент с `holder` + версией по пину отрезка (T2, m1/m2).
- Подводка к агенту — фрейм; лицо подводки утра — **ozhegov**; id первого кадра —
  `morning-wiring` (T4/T10, m3) — дом в `ritual-day` MANIFEST как `frames[…]`.
- Контейнер сам не пинится; сабграф под ним — норма (T9).
- Кит и фрейм — доменные имена одного узора (T7): кит пинит файлы scripts,
  фрейм — отрезки/команды сценария.

---

## Запреты

- Не пересматривать контракт `frames[]` / `auditPins` / segmentHash (это #900 F1–F4).
- Не проектировать форму вердикта (`truth-graph-contour`).
- Не трогать грамматику веток (#785).
- Не подменять Ангелину как `leadPersona` процедуры без явного вердикта комнаты
  (можно уточнить holder’ов *фреймов*).
- Не сводить заседание к «починить CLAUDE.md инлайн» — это антипаттерн T5.
