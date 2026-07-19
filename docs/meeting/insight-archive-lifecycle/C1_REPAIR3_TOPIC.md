# C1R3 — минимальная коррекция C1 после третьего BLOCK

> Общее задание: `MEETING_BRIEF.md`.
> История трёх BLOCK: `C1_AUDIT.md`.
> Это четвёртый и минимальный repair того же C1, не новый DAG-узел.

## Вопрос

**C1 — как заменить ровно шесть заблокированных фрагментов C1R2 так, чтобы итог точно называл immutable subject/scope закрытия, но не определял состояние, переход или необратимость закрытия?**

## Принятая основа, которую не пересматривать

- closable-сущности и факты — разные категории;
- identity INSIGHT сохраняется;
- delivery coverage и outcome coverage — разные dimensions;
- новая фаза создаёт новый immutable mandate/revision и не мутирует прошлое;
- legacy-кейсы не классифицируются; hash/schema/storage/CLI не выбираются.

## Ровно шесть обязательных исправлений

1. Удалить `state ∈ {open, closed}`, монотонность и необратимость. В C1 закрытие — лишь
   утверждение над точным immutable subject/scope; status, revoke/reopen/supersede — C2/C4/C7.
2. `transcribed` — типизированное отношение task–mandate: task транскрибирует конкретный
   REVIEW-мандат. Не выбирать имя поля или schema; INSIGHT не является транскриптом.
3. Не выводить независимость из разных доменов. Оставить только три one-way
   non-implications: `accepted ⇏ transcribed`, `transcribed ⇏ delivered`,
   `delivered ⇏ outcome-proven`; prerequisites не утверждать.
4. Назвать immutable subject/scope для каждой сущности:
   - INSIGHT: решение относится к точной immutable revision содержания/roadmap при
     сохранении стабильного insight identity;
   - MANDATE: фиксированный accepted claim-set/slice-set конкретной revision;
   - SLICE: фиксированный claim, оцениваемый отдельно по delivery и outcome dimensions.
   Не определять, когда/как assertion становится active или revoked.
5. Исправить карту M0: C2 — axes/transitions; C3 — evidence contract; C4 — history,
   derived views, reversible events; C5 — legacy; C7 — operational safety, concurrency,
   idempotency, rollback/reopen; C6 — agent enforcement. Git-команду не делать предметом C4.
6. В логические посылки включить исходные факты C1: INSIGHT = problem/hypothesis/roadmap;
   REVIEW принимает slice; task транскрибирует mandate; delivery не гарантирует outcome и
   исчерпание будущих фаз; MADR decision status ≠ confirmation. Repair-ограничения указать
   отдельно, метафоры не считать основаниями.

## Требуемый единственный вердикт

Отдельный `ВЕРДИКТ C1`, который воспроизводит принятую основу и вносит только шесть
исправлений выше. Любое новое решение C2–C7 запрещено.
