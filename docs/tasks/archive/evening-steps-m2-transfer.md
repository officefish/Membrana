# Архив: Перенос вердикта M2 в evening-ritual-steps.json: единая нумерация и критичность

| Поле | Значение |
|------|----------|
| **ID** | `evening-steps-m2-transfer` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-08-01 |
| **Архивирована** | 2026-08-01 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/EVENING_STEPS_M2_TRANSFER_PROMPT.md`](../../docs/prompts/EVENING_STEPS_M2_TRANSFER_PROMPT.md) |

## Заметки при закрытии

PR #1612. Вердикт M2 заседания evening-review-predicate перенесён в исполняемый источник: 10 day-memo, 11 audit-evening, 12 code-review, 13 archive-code-review; хвост 14-16 не двигался. Проверено ДО правки: все потребители DAILY_CODE_REVIEW.md стоят после ревью. КРИТИЧНОСТЬ НЕ МЕНЯЛАСЬ, хотя M2 её требовал: у audit-evening в whyNoncritical записано «не должен ронять хвост вечера, где живёт обязательный team-evening-feedback» (ADR-0013), и хвост стоит после — решение владельца 01.08 вынести это отдельным предметом. Тем же PR закрыта вторая часть пункта №6 хендофа: диапазон аудита считается по origin/main (AUDIT_TRUNK_REF), отсутствие ствола даёт отказ кодом 2, а не тихий откат к HEAD.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
