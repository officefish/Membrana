# Шаблон антипаттерна: Молчун (`silent`)

> Абстрактный носитель (T13). **Не** pins кита (T18). Ловушка уточняет род на примерах
> ([`../traps/silent-empty-catch.md`](../traps/silent-empty-catch.md)); улов — гранула в
> [`../registry/CATCH_LIST.md`](../registry/CATCH_LIST.md).

| Поле | Значение |
|------|----------|
| **id** | `silent` |
| **defectClass** | `silent` (строка [`BESTIARY_LIST`](../registry/BESTIARY_LIST.md)) |
| **status** | `stub` (W2 #948) |

## Проблема

Сбой или внешний вход **съедается без следа**: пустой `catch`, `\|\| true` в CI/скриптах,
чтение → `null` без декларации. Наблюдатель думает, что «всё зелёное», пока симптом
не всплывёт далеко от места проглатывания.

## Форма

- **Признак:** отсутствие явной декларации намеренности рядом с местом проглатывания
  (комментарий / `by design` / «не блокирует»).
- **Не дефект:** объявленный молчок (best-effort, осознанный soft-fail).
- **Граница с соседними классами:** `ornament` пишет артефакт без читателей;
  `unwired` экспортирует без потребителей; молчун — про **скрытый провал**, не про
  отсутствие провода.

## Анти-примеры (ссылками)

| Роль | Path | Заметка |
|------|------|---------|
| Specimen (фикстура T2) | [`../specimens/silent/swallow.mjs`](../specimens/silent/swallow.mjs) | forcing function для `detectSilent` |
| Улов (stub T1) | [`CATCH_LIST`](../registry/CATCH_LIST.md) · `catch-silent-swallow-specimen` | журнал находки; ≠ specimen |
| Ловушка | [`../traps/silent-empty-catch.md`](../traps/silent-empty-catch.md) | prompts + `detectSilent` |

## Контракт «как паттерн»

Структура зеркалит `docs/patterns/*`: **Проблема → Форма → Анти-примеры**.
Шаблон не исполняется и не пинится; уточнение рода зверей — на стороне ловушки.
