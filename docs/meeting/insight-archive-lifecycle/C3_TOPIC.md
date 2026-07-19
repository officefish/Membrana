# C3 — evidence contract

> Зависимость: вердикт C2.  
> Активный predecessor: `C2_VERDICT.md` (финальный extraction audit: PASS).

## Неподвижный predecessor

- D=decision/MANDATE-revision; L=delivery/SLICE; O=outcome/SLICE;
  V=archive-visibility/representation; все axes = `Option<assessment>`.
- L enum: `delivered|not-delivered`; O enum: `realized|not-realized`; `None` —
  отсутствие assertion, не отрицательный факт.
- `transcribed` = Task→Mandate вне осей и само по себе не доказывает delivery/outcome.
- Projection допустима только для linked mandate/slice/representation tuple.
- Cross-axis prerequisite не выводится без premise; archive не является evidence других осей.
- C3 определяет criteria/evidence, но не меняет identities, enums и events C1/C2.

## Вопрос

**C3 — какой минимальный типизированный evidence contract должен доказать delivery и outcome сущностей C1 в модели C2 для single task, эпика, deploy-gated работы, partial и non-delivery исходов?**

## Требуемый единственный вердикт

- отдельный heading `ВЕРДИКТ C3`;
- target evidence claim строго `(axis=L|O, subject=SLICE, assertedValue)`:
  L=`delivered|not-delivered`, O=`realized|not-realized`; `None` — отсутствие assertion,
  поэтому evidence для None не существует; positive и negative требуют собственного evidence;
- типы узлов и рёбер evidence со ссылкой на immutable C1 subject/scope и linked C2 tuple;
- обязательные и условные поля;
- scenario matrix: single task; epic + child graph; deploy gate; partial per-slice;
  non-delivery. Parent/epic roll-up допустим только из полного linked slice graph;
- правила полноты task graph и acceptance без auto-inference;
- жёсткая классификация evidence / hint / invalid inference. Task status/archive,
  branch/PR existence, `transcribed`, V=`archived` и незамкнутый parent сами по себе
  не являются evidence L/O;
- список фактически использованных premises/sources;
- не менять C1/C2 enums/events и не проектировать C4 history/storage, C5 legacy,
  C6 UX/enforcement или C7 operational safety.
