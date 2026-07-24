# Архив: Cold-start мастера контейнеризации: три паттерна + мета-уровень (контейнер контейнеров)

| Поле | Значение |
|------|----------|
| **ID** | `containerization-coldstart-sync` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-23 |
| **Архивирована** | 2026-07-23 |
| **GitHub Issue** | #993 |
| **Linear** | [DRU-369](https://linear.app/techies68/issue/DRU-369/cold-start-mastera-kontejnerizacii-tri-patterna-meta-uroven-kontejner) (Done) |
| **Промпт** | [`docs/prompts/CONTAINERIZATION_COLDSTART_SYNC_PROMPT.md`](../../docs/prompts/CONTAINERIZATION_COLDSTART_SYNC_PROMPT.md) |

## Заметки при закрытии

Смёржено PR #995 (merge 30addc7e): SKILL.md — три оси паттернов в description/cold-start/Hard rules + раздел «Мета-уровень» (docs/tooling-atlas vs двумерный docs/procedures) + tooling:atlas в Tools; kits README — «два паттерна» → три. Пины не тронуты (MANIFEST.json вне диффа). Проверки: tooling:atlas --audit OK, check:layer-direction 0 нарушений. Унаследованный дрейф kits:audit (3 blocking с #953) вынесен за скоуп.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
