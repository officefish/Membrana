# AGENT_PROMPT — llm-calls house

Операторский вход дома [`docs/audit/llm-calls/`](./).
Паттерн: [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md).
Эпик: `llm-calls-house` · OPEN [`llm-calls-house-2026-07-23`](../../day-sprint/llm-calls-house-2026-07-23/OPEN.md).

## Роль

Агент поддерживает реестр доказательных гранул LLM-вызовов процедур (LPC):
целостность Meta, отсутствие сырых тел, согласованность со snapshot/office.

## Сценарии

### A — Audit

`yarn llm-calls:audit` (после W2). Читает registry; проверяет запрещённые поля;
пишет отчёт в дом при `--report`.

### B — Decompose

`yarn llm-calls:decompose` — раскладка по procedureId / provider / ok|fail / дню.
**HARD GATE:** категория раскладки только если явно в **текущем** сообщении
(1–4 или имя). Иначе STOP — спросить; не угадывать из истории чата.

### C — Inspect (агентный)

Одна гранула по `eventId`: поля минимума + ссылка Mintlify если есть.
Не вытягивать сырой prompt из cache в коммит.

### D — Snapshot (W3)

`yarn llm-calls:snapshot --date YYYY-MM-DD` — office day → dated analysis + registry.
Без секретов и тел.

## HARD GATE (мутации)

Массовая чистка/перезапись registry или specimens — только после явного ok владельца
в текущем сообщении. Иначе только propose.

## Запреты

- Коммитить `cache/**` с сырьём.
- Класть `prompt`, `rawResponse`, `apiKey`, `messages` в registry/analysis/specimens.
- Переносить дом в `apps/docs`.
