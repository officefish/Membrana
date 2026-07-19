# ВЕРДИКТ C1

> Источник решения: `docs/seanses/insight-archive-lifecycle-c1-closure-object-r4-2026-07-18.md`.
> Статус: extraction из содержательно принятого C1R4; новых решений не добавляет.

## Принятая основа

- Closable-сущности и факты — разные категории.
- Identity INSIGHT сохраняется.
- Delivery coverage и outcome coverage — разные dimensions.
- Новая фаза создаёт новый immutable mandate/revision и не мутирует прошлое.
- Legacy-кейсы не классифицируются; hash/schema/storage/CLI не выбираются.

## Шесть принятых решений

1. Closure в C1 — assertion над immutable `(subject, scope)`. Status,
   revoke/reopen/supersede относятся к C2/C4/C7; C1 не определяет состояние,
   монотонность или необратимость.
2. `transcribed` — типизированное отношение `Task → Mandate`: task транскрибирует
   конкретный REVIEW-мандат. Имя поля и schema не выбраны. INSIGHT не является
   транскриптом.
3. Зафиксированы только три one-way non-implications:
   `accepted ⇏ transcribed`, `transcribed ⇏ delivered`,
   `delivered ⇏ outcome-proven`. Независимость из разных доменов не выводится;
   prerequisites не утверждаются.
4. Immutable subject/scope закрытия:
   - INSIGHT — решение над точной immutable revision содержания/roadmap при
     стабильном insight identity;
   - MANDATE — фиксированный accepted claim-set/slice-set конкретной revision;
   - SLICE — фиксированный claim, отдельно оцениваемый по delivery и outcome.
   Когда assertion становится active или revoked, C1 не определяет.
5. Карта ратифицированного M0: C2 — axes/transitions; C3 — evidence contract;
   C4 — history/derived views/reversible events; C5 — legacy; C7 — operational
   safety/concurrency/idempotency/rollback/reopen; C6 — agent enforcement.
   Git-команда не является предметом C4.
6. Логические посылки — исходные domain facts ниже. Repair constraints перечислены
   отдельно. Метафоры из стенограммы не являются основаниями решения.

## Исходные domain premises

- INSIGHT содержит problem, hypothesis и roadmap.
- REVIEW принимает конкретный slice.
- Task транскрибирует REVIEW-мандат.
- Delivery не гарантирует outcome и не гарантирует исчерпание будущих фаз.
- MADR разделяет decision status и confirmation реализации.

## Repair constraints

- Сущность не подменяется фактом.
- Identity INSIGHT не теряется.
- Delivery coverage не подменяется outcome coverage и наоборот.
- Прошлый мандат не мутируется новой фазой.
- C1 не выбирает hash, schema, storage или CLI и не классифицирует legacy-кейсы.
- Вопросы C2–C7 остаются открытыми в соответствии с картой M0.
