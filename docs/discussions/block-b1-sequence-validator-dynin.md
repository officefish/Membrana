# Обсуждение: block-b1-sequence-validator-dynin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-04 12:49 UTC · dynin

**Вопрос:** Ты держатель блока b1-sequence-validator спринта run-journal-sequence-validator (#1683), ратифицирован владельцем 04.08 (v2). Зона: scripts/lib/procedure-run-journal.mjs, scripts/procedure-run-journal.mjs (CLI), scripts/procedure-run-journal.test.mjs. Оценка ~110 строк. Спринт A влит (PR #1706): closeProcedureRun проносит orphanedBy {runId, sequence, trail?}.

**Ответ:**

Предикат `valid_assign(R)` из [1] прямо относится: ты требуешь строгой формализации назначения через `executor`, `assignedBy`, `shotId`. Для sequence-validator ввожу аналогичный контракт:

`valid_seq(R) ⇔ R.sequence ≥ 1 ∧ R.orphanedBy.runId ≠ ∅ ∧ R.orphanedBy.runId ≠ R.runId`

Проверяю по спринту A: `closeProcedureRun` проносит `orphanedBy` — но не проверяет `sequence` нового родителя. Добавляю инвариант: при закрытии с `orphanedBy` валидирую, что `R.orphanedBy.sequence ≤ R.sequence` — иначе цепочка «осиротела» некорректно.

Ещё из [2]: твой стиль — два зуба через `.test.mjs`. Для этого блока нужен третий: `procedure-run-journal.sequence.test.mjs` с кейсами:
- `runId` не повторяется в цепочке (защита от цикла)
- `orphanedBy` указывает на существующий `runId` в журнале
- последовательность монотонна по `closedAt`, не по `Date.now()` — иначе тест флапает.

Вторичная зона из [3] здесь не нужна: блок чистый, без bash/Docker. Но если CLI-часть (`scripts/procedure-run-journal.mjs`) начнёт ходить в сеть — это нарушение контракта, отклоню на ревью.

Итог: валидатор = чистая функция `validateSequence(entry, journal) → {ok, errors[]}`, без состояния, тестируемая моками журнала. Сложность O(n) по длине цепочки, ошибки возвращаю списком.

---
