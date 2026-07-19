# Аудит C1

## Раунд 1 — BLOCK

Протокол: `docs/seanses/insight-archive-lifecycle-c1-closure-object-2026-07-18.md`.

Независимый read-only аудитор подтвердил формальную полноту (17 реплик, пять ролей,
посылки перечислены), но заблокировал вердикт:

- в итоговом разделе нет явной метки `ВЕРДИКТ C1`;
- смешаны принятие мандата, транскрипция в task, delivery и closure;
- `covered(M)` не определяет, какой именно факт создаёт покрытие;
- по Hermes незаконно выведено исчерпание roadmap и преждевременно решён C5.

Раунд не засчитывается; `ial-c1-closure-object` остаётся active.

## Раунд 4 — SUBSTANTIVE PASS / FORMAL BLOCK → PASS

Протокол: `docs/seanses/insight-archive-lifecycle-c1-closure-object-r4-2026-07-18.md`.

- Содержательные шесть исправлений получили независимый PASS.
- Единственный formal BLOCK — отсутствующий heading `ВЕРДИКТ C1` — признан
  механическим extraction-дефектом, не требующим нового обсуждения.
- Председатель извлёк активный вердикт в `C1_VERDICT.md` без новых решений.
- Финальный read-only extraction audit: **PASS**; смысловых искажений нет.

Узел `ial-c1-closure-object` допускается к архиву как завершённая meeting-фаза.

## Раунд 3 — BLOCK

Протокол: `docs/seanses/insight-archive-lifecycle-c1-closure-object-r3-2026-07-18.md`.

Разделение сущностей/фактов, typed coverage и immutable новая фаза приняты, но остались
шесть блокирующих дефектов:

- протащена необратимая state machine `open → closed`, конфликтующая с reopen/revoke;
- `transcribed` ошибочно привязан к INSIGHT вместо отношения task–mandate;
- независимость предикатов незаконно выведена из разных доменов;
- closure scopes INSIGHT/SLICE описаны тавтологически;
- роли C4 и C7 переставлены относительно ратифицированного M0;
- список посылок опускает исходные факты C1.

Раунд не засчитывается; `ial-c1-closure-object` остаётся active.

## Раунд 2 — BLOCK

Протокол: `docs/seanses/insight-archive-lifecycle-c1-closure-object-r2-2026-07-18.md`.

Явная метка вердикта и запрет legacy-классификации исправлены, но независимый аудитор
заблокировал логическую модель:

- closable-сущности перепутаны с фактами `accepted/transcribed/delivered/outcome-proven`,
  а identity INSIGHT потеряна;
- «необходимая цепочка» противоречит заявленным non-implications;
- `origin-hash`, обязательное поле и `git log -S` преждевременно проектируют C3+;
- единый `covered ⇔ outcome-proven` не следует из посылок: delivery coverage и outcome
  coverage должны быть различимы;
- новая фаза мутирует уже принятый мандат вместо нового immutable мандата/revision;
- фактически использованные исходные посылки перечислены неполно.

Раунд не засчитывается; `ial-c1-closure-object` остаётся active.
