# C4 — история и производные views

> Зависимость: вердикт C2.  
> Активный predecessor: `C2_VERDICT.md` (финальный extraction audit: PASS).

## Неподвижный predecessor

- Четыре typed axes D/L/O/V имеют exact subjects и optional assessments.
- Subject/id/scope/claims immutable; новый assessment, revoke и supersede не
  delete/rewrite прежний assertion.
- Supersede — event-only link; reopen создаёт новую revision/new ID/D=`proposed`
  и не создаёт transcription.
- No-delete — semantic constraint C2; C4 решает history representation и derived
  current view, не меняя C2 semantics.
- Full archive no-inference должен сохраняться в replay и views.

## Вопрос

**C4 — какая минимальная модель истории и производных представлений должна хранить переходы C2, чтобы audit, reopen, revoke и supersede были воспроизводимы без сложности полноценной event-sourcing платформы?**

## Требуемый единственный вердикт

- отдельный heading `ВЕРДИКТ C4`;
- source of truth и форма события при замороженных C2 semantics:
  typed `assert`, `revoke`, event-only `supersede(oldDecisionAssertion, successorRevision)`,
  `reopen(oldRevision) → new ID / D=proposed`; axes/enums/subjects не пересматривать;
- hard no-delete: correction/revoke/supersede только append; old assertions/events не
  rewrite/delete; schema evolution сохраняет replay через version/upcast semantics;
- deterministic replay и rebuildable derived current view;
- archive view как visibility projection той же истории: никогда не evidence/implication D/L/O;
- current/archive views сохраняют full C2 no-inference, immutable scope и правило
  reopen без transcription;
- C3 evidence payload/validity — opaque input: C4 хранит ссылку/событие, не определяет
  content или criteria;
- правила append, correction, replay и schema evolution;
- граница, где event sourcing становится избыточным;
- список фактически использованных premises/sources;
- не решать C3 evidence content, C5 legacy, C6 workflow/UX/enforcement или
  C7 operational safety/concurrency.
