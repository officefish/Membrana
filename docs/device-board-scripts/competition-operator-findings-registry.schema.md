# Schema: competition-operator-findings-registry.json

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `id` | string | да | `ODF-<short>-<fork>-<nnn>` |
| `packagingSprintId` | string | да | e.g. `comp-packaging-catalog-2026-06-25` |
| `competitionSprintId` | string | да | e.g. `comp-mvp-async-v2-2026-06-25` |
| `forkId` | string | да | catalog id |
| `team` | `alpha` \| `beta` \| `gamma` | да | |
| `lessonId` | string \| null | нет | `L13` или ссылка на существующий L1–L12 |
| `status` | `open` \| `resolved` \| `wontfix` | да | |
| `symptom` | string | да | Из лога / UI |
| `rootCause` | string | да | |
| `fix` | string | да | Файлы, команды |
| `prevention` | string | да | Для Phase 1 CONCEPT |
| `commitSha` | string \| null | нет | |
| `loggedAt` | string (ISO date) | да | |
| `tags` | string[] | нет | e.g. `async`, `collapse`, `entitlement` |

Append-only: не удалять записи; `status` обновлять in-place.
