# M4a — повестка: доклад usage с локального агента

> M4a · кандидат 8 · зависит от C1+T1 · параллельно V1 · secretary

## **U1 — Как локальный агент (Windows/worktree) доставляет события usage на office?**

Push sync vs batch файл vs только серверные вызовы. Auth, failure mode (уже best-effort из T1).

### Кандидаты (текст)

1. Sync HTTPS POST каждого события из transport сразу после вызова (office URL + token).
2. Append local JSONL + периодический `yarn llm-usage:flush`.
3. Только если процедура уже идёт через office proxy (все LLM через office) — иначе нет клиента.
4. Опциональный opt-in env `LLM_USAGE_EMIT=0` по умолчанию выкл до стабилизации.

### Форма вердикта + **список посылок обязателен.**
Запреты: не UX панели; не менять модель полей T1.
