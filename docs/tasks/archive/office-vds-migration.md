# Архив: Office VDS Migration: переезд background-office на выделенный VDS с новым доменом (OM1-OM4, пивот на KZ)

| Поле | Значение |
|------|----------|
| **ID** | `office-vds-migration` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-11 |
| **Архивирована** | 2026-07-12 |
| **GitHub Issue** | #349 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/OFFICE_VDS_MIGRATION_PROMPT.md`](../../docs/prompts/OFFICE_VDS_MIGRATION_PROMPT.md) |

## Заметки при закрытии

OM4 завершён 2026-07-12: office мигрирован на Timeweb-VDS 176.124.218.4 / office.mmbrn.tech (prod LE cert), Linear cutover подтверждён живьём (DRU-139→200), GitHub secrets, старый office на 72.56.27.58 погашен. Блок ТСПУ был IP-specific — смена IP решила, KZ→fallback.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
