# C2R3 — восстановление канонических четырёх осей

> Общее задание: `MEETING_BRIEF.md`.
> Активный predecessor: `C1_VERDICT.md`.
> Три BLOCK: `C2_AUDIT.md`.
> Это третий repair того же C2, не новый DAG-узел.

## Вопрос

**C2 — как заменить ошибочную типологию C2R2 строго каноническими D/L/O/V records,
не меняя буквы, subjects и число осей и сохранив уже принятые исправления?**

## Замороженная типология — не обсуждать и не переименовывать

| Ось | Единственный смысл | Exact subject |
|---|---|---|
| **D** | decision | MANDATE / mandate-revision |
| **L** | delivery | SLICE |
| **O** | outcome | SLICE |
| **V** | archive/visibility | representation record |

Пятой lifecycle/validation/assertion axis нет. `insightRevision` участвует в join-context,
но не заменяет exact subjects таблицы.

## Восемь обязательных исправлений

1. Воспроизвести четыре оси и subjects дословно из замороженной таблицы.
2. Удалить придуманную lifecycle-axis. Supersede относится к decision assertion/MANDATE.
3. Вернуть V=archive/visibility с asserted values `active|archived` (или точными
   семантическими эквивалентами) и subject representation record.
4. D values: `proposed|accepted|rejected|deferred`; если `superseded` остаётся assessment,
   он добавляется supersede-event старому MANDATE/revision без terminal/monotonic claim.
5. L/O values только на SLICE. `None` — отсутствие assertion; реальные отрицательные
   assessments (`not-delivered`, `not-realized` либо принятые эквиваленты) не равны None.
   Evidence meaning/criteria остаётся C3.
6. Полный archive no-inference: `V ⇏ D,L,O` и `D,L,O ⇏ V`; no auto-mutation.
7. Projection строго:
   `D_opt(mandate) × L_opt(slice) × O_opt(slice) × V_opt(representation)` только при
   `mandate belongs-to insightRevision`, `slice ∈ mandate.scope`,
   `representation represents exact subject/scope`. Unlinked/ill-typed join forbidden.
8. `supersede(oldDecisionAssertion, successorRevision)` добавляет `superseded` assessment
   старому MANDATE/revision или только event-link; generic assertion subject/axis запрещён.

## Уже принятая основа — сохранить

- `Option<assessment>`; None не enum-value.
- `transcribed` = Task→Mandate вне осей.
- reopen создаёт new revision/new ID/initial D=`proposed`, но не transcription.
- subject/id/scope/claims immutable; prior assertions не delete/rewrite.
- no-delete — semantic constraint, history/derived view остаются C4.
- sources атрибутируются C1/C2_TOPIC/repair/M0; карта C6/C7 не меняется.

## Требуемый единственный вердикт

Отдельный `ВЕРДИКТ C2` с канонической таблицей D/L/O/V, optional values/events,
projection/matrix, отдельными inference/mutation invariants и sources. Любая пятая ось,
переименование или subject substitution автоматически делает вердикт недействительным.
