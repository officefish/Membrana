# M3b — повестка: модель телеметрии вызова

> M3b · кандидат 2 · зависит от P1+C1 · параллельно X1/F1 · secretary

## **T1 — Какова модель события учёта LLM-вызова и где она хранится?**

Поля события, хранилище, retention, что нельзя писать (секреты, полный промпт).
Связь с панелью — только контракт данных, не UX.

### Кандидаты (текст)

1. Событие минимум: `{ts, procedureId, provider, model, source, tokensIn, tokensOut, latencyMs, ok, errorClass?}`; store = office; retention 30 дней.
2. То же + `promptHash` (без тела); retention 90 дней; сырой промпт никогда.
3. Только счётчики агрегатов за день (без per-call); privacy max.
4. Git-append JSONL в docs/ (нет) vs office-only.

### Форма вердикта + **список посылок обязателен.**
Запреты: не UI панели; не resolve канала (C1); не fallback policy (F1).
