# C2R4 — замыкание L/O domains и supersede-модели

> Общее задание: `MEETING_BRIEF.md`.
> Активный predecessor: `C1_VERDICT.md`.
> Четыре BLOCK: `C2_AUDIT.md`.
> Это узкий четвёртый repair того же C2, не новый DAG-узел.

## Вопрос

**C2 — какие ровно exact L/O assessment enums и какая единственная supersede-модель
замыкают уже принятую каноническую D/L/O/V типологию без новых решений C3–C7?**

## Замороженная основа — не пересматривать

- D=decision/MANDATE-revision; L=delivery/SLICE; O=outcome/SLICE;
  V=archive-visibility/representation; пятой оси нет.
- Каждая axis = `Option<assessment>`; `None` вне enum.
- D содержит `proposed|accepted|rejected|deferred`; V содержит `active|archived`.
- Projection = `D_opt(mandate) × L_opt(slice) × O_opt(slice) × V_opt(representation)`
  над тремя abstract join predicates.
- Full archive no-inference, immutable scope, no-overwrite, transcribed outside axes,
  reopen new revision/no transcription, source map и C6/C7 map сохранены.

## Ровно два содержательных решения

1. Выбрать и дословно назвать замкнутые minimal enums:
   - L = `Option<{delivered, not-delivered}>` либо другой точный positive/negative pair;
   - O = `Option<{realized, not-realized}>` либо другой точный positive/negative pair.
   `None` означает отсутствие assertion; negative value — реальный assertion. Criteria/evidence — C3.
2. Выбрать одну supersede-модель без «или»:
   - предпочтительная минимальная: event-only link
     `supersede(oldDecisionAssertion, successorRevision)` без нового D-value;
   - альтернативная: добавить `superseded` в D enum.
   Выбрать ровно одну, без terminal/monotonic semantics и без generic assertion-axis.

## Требуемый единственный вердикт

Отдельный `ВЕРДИКТ C2`, содержащий только два решения выше и подтверждение, что после них
domains замкнуты, product exhaustive, а вся замороженная основа остаётся неизменной.
После PASS председатель делает mechanical `C2_VERDICT.md` extraction с точными premises,
картой C3–C7 и исправленным footer; новых содержательных решений при extraction нет.
