# ВЕРДИКТ C2

> Источники решения: C2R3 и содержательно принятый C2R4
> (`docs/seanses/insight-archive-lifecycle-c2-state-axes-r4-2026-07-19.md`,
> `docs/seanses/insight-archive-lifecycle-c2-state-axes-r5-2026-07-19.md`).
> Статус: mechanical extraction; новых решений не добавляет.

## Канонические typed axes

| Ось | Смысл | Exact subject | Тип active assessment |
|---|---|---|---|
| **D** | decision | MANDATE / mandate-revision | `Option<{proposed, accepted, rejected, deferred}>` |
| **L** | delivery | SLICE | `Option<{delivered, not-delivered}>` |
| **O** | outcome | SLICE | `Option<{realized, not-realized}>` |
| **V** | archive / visibility | representation record | `Option<{active, archived}>` |

- `None` находится вне каждого enum и означает отсутствие assertion.
- Отрицательные `not-delivered` и `not-realized` — реальные assertions, не `None`.
- Пятой lifecycle/validation/assertion axis нет.
- Criteria и evidence для assessments остаются C3.

## Assessment events и relations

- `assert(axis, value)` добавляет assessment, допустимый для exact subject этой оси.
- `revoke(assertion)` не удаляет и не переписывает прежний assertion; представление
  истории и вычисление active view остаются C4.
- Единственная supersede-модель — event-only link
  `supersede(oldDecisionAssertion, successorRevision)`. Она не добавляет D-value,
  не создаёт generic assertion-axis и не задаёт terminal/monotonic semantics.
- `reopen(oldRevision)` создаёт новую revision с новым ID и initial D=`proposed`.
  Reopen не создаёт transcription.
- `transcribed` остаётся typed relation `Task → Mandate` вне четырёх осей. Если relation
  появляется для новой revision, она ссылается на её новый Mandate, а не переносится
  со старого.

## Well-typed projection и exhaustive matrix

Projection:

`D_opt(mandate) × L_opt(slice) × O_opt(slice) × V_opt(representation)`

допустима только при всех abstract predicates:

- `mandate belongs-to insightRevision`;
- `slice ∈ mandate.scope`;
- `representation represents exact subject/scope`.

Все optional assignments над такой linked tuple разрешены. Unlinked или ill-typed join
запрещён. Cross-axis prerequisites, которых нет в посылках, не выводятся.

## Inference и mutation invariants

- Full archive no-inference: `V ⇏ D,L,O` и `D,L,O ⇏ V`.
- Assertion одной оси не создаёт и не изменяет assertion другой оси автоматически.
- Subject, ID, scope и claims immutable; новая revision получает новый ID.
- Новый assessment, revoke или supersede не delete/rewrite прежний assertion.
- No-delete — semantic constraint C2, не выбор history/storage representation; способ
  хранения событий и derived current view решает C4.

## Фактически использованные premises

| Источник | Premises |
|---|---|
| **C1_VERDICT** | Immutable subject/scope; stable insight identity; Task→Mandate relation; `accepted ⇏ transcribed`, `transcribed ⇏ delivered`, `delivered ⇏ outcome-proven`; delivery и outcome — разные dimensions; новая phase не мутирует прошлый mandate. |
| **C2_TOPIC** | Отдельные decision/delivery/outcome/archive-visibility axes; heterogeneous task archive содержит delivered, branch-only, wontfix, duplicate и defer, поэтому archive не доказывает другие axes; reopen/supersede/reject/defer не мутируют C1 scope. |
| **C2 repairs** | Отсутствие assertion = `None`; prerequisites не выводятся без premise; exact subjects и abstract join predicates; no-overwrite; reopen не создаёт transcription; canonical D/V domains; exact L/O domains; event-only supersede. |
| **M0 / DEPS** | C2 отвечает только за axes/transitions/invariants; последующие вопросы остаются отдельными DAG-узлами. |

## Явно оставлено открытым

| Узел | Предмет |
|---|---|
| **C3** | Evidence contract и criteria assessments |
| **C4** | History, reversible events, derived/current views и storage representation |
| **C5** | Legacy migration и классификация кандидатов |
| **C6** | Agent workflow/enforcement и возможный CLI surface |
| **C7** | Operational safety, concurrency, idempotency, rollback/reopen guards |

## Проверка extraction

- Канонические D/L/O/V names, subjects и D/V domains не изменены.
- L/O domains завершены exact positive/negative pairs; `None` остаётся вне enum.
- Выбрана одна supersede-модель без альтернативы.
- Non-binding UI-заметка протокола не входит в канонический вердикт.
- C3–C7 не спроектированы.

## Формальная справка по C2R4

- Реплик: 18.
- Роли: Математик — 4; Структурщик — 4; Верстальщик — 3;
  Teamlead — 4; Музыкант — 3.
- Все пять ролей участвовали; два нарушения заявленного циклического порядка признаны
  неблокирующими.
