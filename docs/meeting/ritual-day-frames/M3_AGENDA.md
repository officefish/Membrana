# Повестка M3 — карта holder’ов кадров утра

> Заседание `ritual-day-frames`, фаза M3 (кандидат 2 по M0).
> Задание: [`MEETING_BRIEF.md`](./MEETING_BRIEF.md) — прочесть целиком до реплик.
> Предшественники: M0 · M1 (инвентарь) · M2 (ранг wiring → preflight) — посылки.

---

## Вопрос заседания

**H1 — кто holder каждого кадра очереди утра (`preflight` / `frames` / `post`
из вердикта M2), и как карта лиц соотносится с `leadPersona: angelina`
процедуры `ritual-day`?**

Не решать механику pin и границу кит↔фрейм (M4); не писать DoD миграции (M5).

---

## Фактура

- **Очередь M2** ([`m2-wiring-rank`](../../seanses/ritual-day-frames-m2-wiring-rank-2026-07-22.md)):
  - `preflight: [morning-wiring]` — holder **уже** ozhegov (m3; не переоткрывать);
  - `frames: [morning-hygiene, weekly-plan-gate, strategy-day, daily-standup,
    main-day-probe, main-day-issue, angelina-greeting]`;
  - `post: [swallow-send, hermes-brief]` (ручной).
- **Инвентарь M1**: id provisional кроме `morning-wiring`; scope кадров — в
  протоколе [`m1-inventory`](../../seanses/ritual-day-frames-m1-inventory-2026-07-22.md).
- **Процедура**: `leadPersona: angelina`, `kitVersion: kits/angelina-morning`.
  BRIEF запрещает подменять Ангелину как leadPersona без вердикта; можно
  уточнять holder’ов *фреймов*.
- Словарь персон команды (известные лица): angelina, ozhegov, vesnin, dynin,
  kuryokhin, rodchenko — не расширять без нужды.

## Что комната должна выдать

- Таблицу `id кадра → holder` для всех узлов `preflight` + `frames` + `post`.
- Явное правило: чем holder фрейма отличается от `leadPersona` процедуры
  (один lead на процедуру vs лицо каждого кадра).
- Где один holder на несколько кадров допустим / обязателен; где нет.
- Что делать с provisional-id: держатель назначается на provisional-имя
  (канон имён — не эта комната) или ждём канонизации.

## Список посылок — обязателен

Вердикт обязан нести секцию с заголовком ровно **«Список посылок»**: полный список
входов, у каждого пометка **факт** или **норма**. Только входы.
Вердикты M0–M2 — легальные посылки-предшественники.

## Запреты этой комнаты

- Не менять holder `morning-wiring` = ozhegov и не трогать три двери m3.
- Не проводить границу «файл кита vs `frames[].pin`» — M4.
- Не решать timing/`frames[]` в MANIFEST vs #900 — M5.
- Не переименовывать provisional-id без необходимости для назначения лица.
- Не менять `leadPersona: angelina` процедуры, если вердикт не требует явной
  замены (уточнение holder’ов фреймов ≠ смена lead).
