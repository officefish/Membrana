# ADR-0015 — форма поля пина фрейма: `pins[]`

> **Статус:** DRAFT · 2026-07-22  
> **merge файла ≠ принятие решения** пока статус DRAFT — решения действуют после LGTM владельца.

## Контекст

Заседание [`procedure-frames`](../meeting/procedure-frames/EPIC.md) оставило шов Ф1↔Ф3:
контракт M1 — `pin?` (единственный); DoD M3 — **три** пина у `morning-wiring`
(три двери). Выбор формы — ниже консилиум-гейта, фиксируется ADR при F0 спринта
#900. Соседнее заседание [`ritual-day-frames`](../meeting/ritual-day-frames/EPIC.md)
подтвердило три двери и класс C (doc-ref); ранг wiring — `preflight`, не меняет
форму поля пина.

## Наблюдаемое состояние (подтверждено кодом)

| Факт | Где (файл:строка @ дата) |
|------|--------------------------|
| Схема MANIFEST Р1: ровно 5 ключей; лишний ключ = дефект | `scripts/lib/validate-procedure.mjs:26–34` @ 2026-07-22 |
| `frames` / `pins` в валидаторе ещё нет | тот же файл @ 2026-07-22 |
| Три двери wiring зафиксированы вердиктом m3 | `docs/seanses/procedure-frames-m3-morning-frame-2026-07-22.md` |
| Раскладка утра: wiring ∈ preflight | `docs/meeting/ritual-day-frames/EPIC.md` @ #939 |

## Решение

### Р1 — каноническое поле `pins?: Pin[]`

- Элемент фрейма: `{ id, holder, pins?: Pin[] }`.
- `Pin = { path, anchor: { kind, ref }, segmentHash }` (механика — F2 / вердикт m2).
- Ноль пинов → ключ **опущен** (не `pins: []`), чтобы optional оставался честным.
- Один пин → `pins: [ one ]` (массив длины 1), не отдельное скалярное поле.

### Р2 — синоним `pin` на чтении (только F1 transitional)

- Валидатор F1 **принимает** устаревшее `pin?: Pin` и нормализует к `pins: [pin]`
  во внутреннем представлении / предупреждении.
- В **записи** (новые манифесты, F3) — только `pins[]`. После F5 синоним можно
  снять отдельной задачей (не блокер #900).

### Р3 — границы

- Пакет/слой: `scripts/lib/validate-procedure.mjs` + будущий `auditPins` (F2);
  не `@membrana/core`.
- Не пересматривает вердикты M1–M4 / T1–T11.
- Не выбирает синтаксис ключей `preflight`/`frames`/`post` (это F1 + норма
  ritual-day-frames M2/M5) — только форма пина **внутри** элемента фрейма.

## Definition of Done (для будущей реализации)

- [ ] F1: схема элемента с `pins?: Pin[]`; тест: три пина у фрейма валидны; `pin` скаляр нормализуется
- [ ] F3: `morning-wiring` в MANIFEST пишет `pins` длины 3
- [ ] Живущие процедуры без `frames` остаются зелёными
- [ ] После LGTM владельца — статус ADR → ACCEPTED

## Out of scope / открытые задачи

- Реализация `auditPins` / segmentHash — F2
- Носитель `preflight` vs `frames` — F1/F3 по EPIC ritual-day-frames
- CI анти-дубль GROUP_* — хвост №2, dynin

## Ссылки

- EPIC procedure-frames §хвост 1: `docs/meeting/procedure-frames/EPIC.md`
- EPIC ritual-day-frames: `docs/meeting/ritual-day-frames/EPIC.md`
- Issue F0: [#926](https://github.com/officefish/Membrana/issues/926)
