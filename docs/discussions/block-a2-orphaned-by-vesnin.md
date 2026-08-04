# Обсуждение: block-a2-orphaned-by-vesnin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-04 12:26 UTC · vesnin

**Вопрос:** Ты держатель блока a2-orphaned-by спринта sprint-dictionary-to-lib (#1681), ратифицирован владельцем 04.08. Зона: scripts/lib/procedure-run-journal.mjs, scripts/procedure-run-record.mjs, scripts/procedure-run-record.test.mjs. Оценка ~100 строк. Контракт журнала — твой предмет (блоки 1 и 3а спринта run-journal-producer).

**Ответ:**

Тема — блок a2-orphaned-by, но из облака релевантна только одна нить: **фрагмент из [4] agent-tooling-friction** — «это не пакет в смысле packages/*, это спринт-зонтик для независимых scripts/*.mjs. Кода в packages/ не появляется, граф зависимостей ARCHITECTURE.md не трогается». К ЧЕМУ относится: то же самое здесь — `sprint-dictionary-to-lib` не создаёт нового пакета, а двигает код внутри `scripts/`; граница `ARCHITECTURE.md` не затрагивается, поэтому не нужен ADR и не нужен консилиум — это структурная зачистка в зоне скриптов.

**Конструкция.** ОрфанedBy в `procedure-run-journal.mjs` — поле, которое указывает, каким прогоном закрыт текущий. Проверка: при `closeProcedureRun` в `procedure-run-record.mjs` поле проставляется; в `procedure-run-record.test.mjs` — тест на монотонность sequence внутри runId (из `run-journal-sequence-validator`, #1683).

**Варианты с ценой.**
1. Поле orphanedBy вычисляется как производное от `sequence` соседних записей — цена: хрупко, ломается при ручных правках.
2. Поле хранится явно, пишется только в `closeProcedureRun` — цена: один источник истины, тест проверяет инвариант «закрытый run имеет orphanedBy». Рекомендую.

**Затронутые модули.** `scripts/lib/procedure-run-journal.mjs` (тип записи), `scripts/procedure-run-record.mjs` (запись orphanedBy), `scripts/procedure-run-record.test.mjs` (инвариант).

**Рекомендация.** Форма простая, ADR не нужен. Уточняющий вопрос: orphanedBy пишется в тот же объект run, что и sequence, или это отдельное поле на уровне журнала?

---
