# Промпт: Шаг архива сессий в вечерней цепочке

> **Task-промпт для агента-разработчика** (membrana-local-sprint).
> Размер задачи: **M**. Ожидаемый артефакт: **1 PR** — вечерний шаг archivarius + честный offline-исход.
> Реестр: `id` = `archivarius-evening-step` в [`docs/tasks/registry.json`](../tasks/registry.json).
> Эпик: `archivarius-sessions-container` ([#1330](https://github.com/officefish/Membrana/issues/1330)).

## Контекст

Первый срез контейнера сессий собран в стволе: дом `docs/archivarius/`, Mongo в
office-compose, `GET span → {bytes, sha256}`, evidence-мост, глаголы мастерской,
ingest с маскировкой (`maskedLines`). Тракт scan→extract→ingest→push существует
связанной цепочкой (`runTract`, `yarn archivarius:push`; вещдок 04.08 — заливка
106884/106884 спанов, зубы 13/13). Зазор: в `docs/tasks/evening-ritual-steps.json`
шага archivarius НЕТ — сессии дня доезжают в архив только руками. Обоснование
дня 13.08: контейнер должен оборачивать ПОТОК сессий, а не точку.

## Промпт целиком

Построить вечерний шаг архива сессий:

- `scripts/archivarius-evening-step.mjs`: предполётная проверка office (health),
  прогон тракта по локальным транскриптам (`~/.claude/projects`, при наличии —
  codex/cursor источники), push в office, отчёт ТОЛЬКО счётчиками
  `{files, spans, maskedLines, accepted}` — тела строк в stdout не попадают;
- office недоступен → именованный исход-skip (не молчок, не красный всего вечера):
  словарь исходов, `findingExitCodes` для «находка ≠ поломка»;
- запись шага в `docs/tasks/evening-ritual-steps.json`: `kind: mechanic`,
  `criticality: noncritical` + честный `whyNoncritical` (office транзиентно
  таймаутит — вечер не блокируется), `consumes`/`produces` по факту;
- секрет-граница прежняя: маскировка ingest обязательна, полные строки с
  находками в базу не пишутся (веха `secret-parser-built` не снята);
- тесты рядом: исходы (ok / office-down / пустой день), форма отчёта счётчиками.

## Контракт трёх инвариантов (фиксация по ревью Веснина 13.08 — не «на словах»)

1. **Формат отчёта шага** — ровно одна строка счётчиков:
   `archivarius-evening: files=<n> spans=<n> maskedLines=<n> accepted=<n>` —
   и ничего из тел строк; инвариант держит снапшот-тест в e1.
2. **Имя skip-исхода** — `office-unreachable` (словарь исходов шага:
   `ok | office-unreachable | empty-day`); exit-код исхода-находки объявляется в
   `findingExitCodes` манифеста, вечер не краснеет.
3. **Маска** — ТОЛЬКО существующие правила `scripts/lib/secret-redact.mjs`
   (урок #537: два детектора не должны разойтись); новые регэкспы в этом
   спринте не заводятся.

## Definition of Done

- [ ] `yarn ritual:evening` несёт шаг архива сессий; прогон пишет счётчики в вывод цепочки.
- [ ] office недоступен → шаг завершает вечер именованным skip, вечер не падает.
- [ ] Тела строк транскриптов не появляются в stdout/логах шага (только счётчики).
- [ ] `node --test scripts/archivarius-evening-step.test.mjs` — зелёный; регресс 13 зубов archivarius не тронут.
- [ ] Карточка `archivarius-evening-step` закрывается PR со свидетельством.

## Out of Scope

- Prod deploy office/Mongo (слово владельца).
- Починка форматов транскриптов харнесов.
- Серверный search/UI поверх Mongo — следующая фаза эпика.
- Снятие вехи `secret-parser-built` (отдельный критерий, экспериментальный слот дня).
