# Обсуждение: block-e1-verdict-diagnosis-vesnin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-05 21:06 UTC · vesnin

**Вопрос:** Ты держатель блока e1-verdict-diagnosis спринта review-honesty (ратифицирован владельцем 05.08 21:05Z). Зона: scripts/lib/review-gate.mjs, scripts/review-gate.mjs, scripts/review-gate.test.mjs. Оценка ~90 строк. Контракт вердикта гейта — твой предмет.

**Ответ:**

[память:подсознание] emerge vesnin-2026-07-23-llm-procedure-channels-m5-sprint-ready — оттуда правило «DoD v1: code-review и consilium читают effective chain». Для e1-verdict-diagnosis это прямая аналогия: гейт обязан **читать** вердикт как трёхзначный, а не бинарный — иначе honest-pair из [4] RAG обещает пару, которой не проверяет.

**Конструкция.** Вердикт ревью — не bool `passed/failed`, а домен из трёх состояний: `approved` (готово к merge), `changes_requested` (нужны правки, автор ещё в игре), `rejected` (снято с рассмотрения, oversized/recut). Гейт диагностирует, какое из трёх, и возвращает решение для downstream (merge / hold / release-branch).

**Варианты с ценой.**
1. Enum `Verdict = 'approved' | 'changes_requested' | 'rejected'` + чистая функция `diagnoseVerdict(reviewState) → Verdict`. Цена: один источник истины, тестируется моками GH API. Рекомендую.
2. Два bool-флага (`isApproved`, `isRejected`). Цена: невалидные комбинации (`true/true`), гейт молча выбирает по приоритету — то самое «обещание пары, которой не проверяет».
3. Читать напрямую из `commit-status`. Цена: гейт привязан к транспорту GH, тест требует сеть.

**Затронутые модули.** `scripts/lib/review-gate.mjs` (чистая `diagnoseVerdict`, enum), `scripts/review-gate.mjs` (CLI, чтение состояния PR → вызов диагноза → exit code по трём исходам), `scripts/review-gate.test.mjs` (по кейсу на каждый из трёх исходов + инвариант «ровно один исход»).

**Рекомендация.** Форма. ADR не нужен — зона `scripts/`, граф `ARCHITECTURE.md` не трогается (как в [1] RAG по a2-orphaned-by).

Уточнение: `rejected` в терминах гейта — это только oversized/recut-снятие, или сюда же попадает `changes_requested` после N итераций без ответа автора? От этого зависит, читает ли `diagnoseVerdict` историю ревью или только последнее состояние.

---
