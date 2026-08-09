# Архив: RT4: Prisma multi-node (снять @unique с Node.membraneId, лимит тарифа) + API

| Поле | Значение |
|------|----------|
| **ID** | `mp7b-rt4-multinode-schema` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-06-18 |
| **Архивирована** | 2026-08-09 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/DEVICE_BOARD_REALTIME_RUNTIME_EPIC_PROMPT.md`](../../docs/prompts/DEVICE_BOARD_REALTIME_RUNTIME_EPIC_PROMPT.md) |

## Заметки при закрытии

RT4 закрыт коммитом aca18fe7: @unique с Node.membraneId снят (в актуальной schema.prisma остался только @@index([membraneId])), добавлены Tariff.maxNodesPerMembrane, миграция 20260618120000_mp7b_multinode и node-limit с тестами; миграция применена на проде (постмортем MP7b).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
